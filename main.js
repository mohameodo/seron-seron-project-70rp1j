document.addEventListener('DOMContentLoaded', () => {
    const NOTE_MAP = {
        'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
        'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
        'A#4': 466.16, 'B4': 493.88, 'C5': 523.25
    };

    let audioContext;
    let isRecording = false;
    let recording = [];
    let recordingStartTime;

    const keys = document.querySelectorAll('.key');
    const recordBtn = document.getElementById('record-btn');
    const playBtn = document.getElementById('play-btn');
    const downloadBtn = document.getElementById('download-btn');
    const statusText = document.getElementById('status-text');

    const initAudioContext = () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    };

    const playNote = (note, duration = 500) => {
        if (!audioContext) return;
        const frequency = NOTE_MAP[note];
        if (!frequency) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sawtooth'; // K-pop synth sound
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

        gainNode.gain.setValueAtTime(1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration / 1000);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);

        if (isRecording) {
            recording.push({
                note,
                startTime: Date.now() - recordingStartTime,
                duration
            });
        }
    };

    const handleKeyPress = (e) => {
        initAudioContext();
        const note = e.target.dataset.note;
        if (note) {
            playNote(note);
            e.target.classList.add('playing');
            setTimeout(() => e.target.classList.remove('playing'), 200);
        }
    };

    keys.forEach(key => {
        key.addEventListener('mousedown', handleKeyPress);
        key.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleKeyPress(e);
        });
    });

    recordBtn.addEventListener('click', () => {
        isRecording = !isRecording;
        if (isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });

    playBtn.addEventListener('click', () => {
        if (recording.length > 0) {
            playRecording();
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (recording.length > 0) {
            downloadRecording();
        }
    });

    const startRecording = () => {
        recording = [];
        recordingStartTime = Date.now();
        recordBtn.querySelector('span').textContent = 'Stop';
        recordBtn.classList.add('recording');
        statusText.textContent = 'Recording...';
        playBtn.disabled = true;
        downloadBtn.disabled = true;
    };

    const stopRecording = () => {
        recordBtn.querySelector('span').textContent = 'Record';
        recordBtn.classList.remove('recording');
        statusText.textContent = recording.length > 0 ? 'Recording finished!' : 'Ready to record.';
        if (recording.length > 0) {
            playBtn.disabled = false;
            downloadBtn.disabled = false;
        }
    };

    const playRecording = async () => {
        if (recording.length === 0) return;
        setPlaybackState(true);
        for (const event of recording) {
            await new Promise(resolve => setTimeout(resolve, event.startTime - (Date.now() - playbackStartTime)));
            const keyElement = document.querySelector(`.key[data-note='${event.note}']`);
            if (keyElement) {
                keyElement.classList.add('playing');
                setTimeout(() => keyElement.classList.remove('playing'), event.duration);
            }
            playNote(event.note, event.duration);
        }
        setPlaybackState(false);
    };
    
    let playbackStartTime;
    const setPlaybackState = (isPlaying) => {
        if(isPlaying) {
            playbackStartTime = Date.now();
            statusText.textContent = 'Playing back...';
            recordBtn.disabled = true;
            playBtn.disabled = true;
            downloadBtn.disabled = true;
        } else {
            statusText.textContent = 'Playback finished.';
            recordBtn.disabled = false;
            playBtn.disabled = false;
            downloadBtn.disabled = false;
        }
    };

    const downloadRecording = async () => {
        if (recording.length === 0) return;
        statusText.textContent = 'Preparing download...';
        const totalDuration = recording[recording.length - 1].startTime + recording[recording.length - 1].duration;
        const offlineCtx = new OfflineAudioContext(2, 44100 * totalDuration / 1000, 44100);

        recording.forEach(event => {
            const frequency = NOTE_MAP[event.note];
            const oscillator = offlineCtx.createOscillator();
            const gainNode = offlineCtx.createGain();
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(frequency, event.startTime / 1000);
            gainNode.gain.setValueAtTime(1, event.startTime / 1000);
            gainNode.gain.exponentialRampToValueAtTime(0.001, (event.startTime + event.duration) / 1000);
            oscillator.connect(gainNode);
            gainNode.connect(offlineCtx.destination);
            oscillator.start(event.startTime / 1000);
            oscillator.stop((event.startTime + event.duration) / 1000);
        });

        const audioBuffer = await offlineCtx.startRendering();
        const wav = bufferToWave(audioBuffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'kpop-beat.wav';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        statusText.textContent = 'Download complete!';
    };

    function bufferToWave(abuffer) {
        let numOfChan = abuffer.numberOfChannels, len = abuffer.length * numOfChan * 2 + 44, buffer = new ArrayBuffer(len), view = new DataView(buffer), channels = [], i, sample, offset = 0, pos = 0;
        setUint32(0x46464952); // "RIFF"
        setUint32(len - 8); // file length - 8
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
        setUint32(len - pos - 4); // chunk length
        for (i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));
        while (pos < len) {
            for (i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++
        }
        return buffer;

        function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
        function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
    }
});