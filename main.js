document.addEventListener('DOMContentLoaded', () => {
    const NOTE_FREQUENCIES = {
        'C4': 261.63, 'Db4': 277.18, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 
        'F4': 349.23, 'Gb4': 369.99, 'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 
        'Bb4': 466.16, 'B4': 493.88, 'C5': 523.25, 'Db5': 554.37, 'D5': 587.33, 
        'Eb5': 622.25, 'E5': 659.25
    };

    const keys = document.querySelectorAll('.key');
    const recordBtn = document.getElementById('recordBtn');
    const playBtn = document.getElementById('playBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    let audioContext;
    let isRecording = false;
    let recordingStartTime;
    let recordedNotes = [];

    const initAudioContext = () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    };

    const playNote = (note, duration = 300) => {
        initAudioContext();
        const frequency = NOTE_FREQUENCIES[note];
        if (!frequency) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration / 1000);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration / 1000);

        if (isRecording) {
            recordedNotes.push({
                note,
                startTime: Date.now() - recordingStartTime,
                duration
            });
        }
    };

    keys.forEach(key => {
        const note = key.dataset.note;
        key.addEventListener('mousedown', () => {
            playNote(note);
            key.classList.add('active');
        });
        key.addEventListener('mouseup', () => key.classList.remove('active'));
        key.addEventListener('mouseleave', () => key.classList.remove('active'));
        key.addEventListener('touchstart', (e) => {
            e.preventDefault();
            playNote(note);
            key.classList.add('active');
        });
        key.addEventListener('touchend', () => key.classList.remove('active'));
    });

    recordBtn.addEventListener('click', () => {
        isRecording = !isRecording;
        if (isRecording) {
            recordedNotes = [];
            recordingStartTime = Date.now();
            recordBtn.classList.add('recording');
            recordBtn.querySelector('span').textContent = 'Stop';
            playBtn.disabled = true;
            downloadBtn.disabled = true;
        } else {
            recordBtn.classList.remove('recording');
            recordBtn.querySelector('span').textContent = 'Record';
            if (recordedNotes.length > 0) {
                playBtn.disabled = false;
                downloadBtn.disabled = false;
            }
        }
    });

    playBtn.addEventListener('click', () => {
        if (recordedNotes.length === 0) return;
        playBtn.disabled = true;
        recordBtn.disabled = true;
        downloadBtn.disabled = true;

        recordedNotes.forEach(noteEvent => {
            setTimeout(() => {
                playNote(noteEvent.note, noteEvent.duration);
                const key = document.querySelector(`.key[data-note='${noteEvent.note}']`);
                if (key) {
                    key.classList.add('active');
                    setTimeout(() => key.classList.remove('active'), noteEvent.duration);
                }
            }, noteEvent.startTime);
        });

        const totalTime = recordedNotes[recordedNotes.length - 1].startTime + recordedNotes[recordedNotes.length - 1].duration;
        setTimeout(() => {
            playBtn.disabled = false;
            recordBtn.disabled = false;
            downloadBtn.disabled = false;
        }, totalTime);
    });

    downloadBtn.addEventListener('click', () => {
        if (recordedNotes.length === 0) return;
        const wavBuffer = createWavFile(recordedNotes);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'seron-piano-recording.wav';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    function createWavFile(notes) {
        initAudioContext();
        const sampleRate = audioContext.sampleRate;
        const totalDuration = (notes[notes.length - 1].startTime + notes[notes.length - 1].duration) / 1000;
        const buffer = audioContext.createBuffer(1, Math.ceil(sampleRate * totalDuration), sampleRate);
        const channelData = buffer.getChannelData(0);

        notes.forEach(noteEvent => {
            const freq = NOTE_FREQUENCIES[noteEvent.note];
            const startTime = noteEvent.startTime / 1000;
            const duration = noteEvent.duration / 1000;

            for (let i = 0; i < sampleRate * duration; i++) {
                const time = i / sampleRate;
                const sampleIndex = Math.floor((startTime + time) * sampleRate);
                if (sampleIndex < channelData.length) {
                    channelData[sampleIndex] += Math.sin(2 * Math.PI * freq * time) * (1 - time / duration);
                }
            }
        });

        return bufferToWave(buffer, buffer.length);
    }

    function bufferToWave(abuffer, len) {
        let numOfChan = abuffer.numberOfChannels,
            length = len * numOfChan * 2 + 44,
            buffer = new ArrayBuffer(length),
            view = new DataView(buffer),
            channels = [], i, sample,
            offset = 0,
            pos = 0;

        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length - 8
        setUint32(0x45564157); // "WAVE"

        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16); // length = 16
        setUint16(1); // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(abuffer.sampleRate);
        setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2); // block-align
        setUint16(16); // 16-bit

        setUint32(0x61746164); // "data" - chunk
        setUint32(length - pos - 4);

        for (i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));

        while (pos < length) {
            for (i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }
        return buffer;

        function setUint16(data) {
            view.setUint16(pos, data, true);
            pos += 2;
        }

        function setUint32(data) {
            view.setUint32(pos, data, true);
            pos += 4;
        }
    }
});