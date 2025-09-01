document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameBoard = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('high-score');
    const finalScoreDisplay = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');
    const songListContainer = document.getElementById('song-list');

    // --- Game State ---
    let score = 0;
    let highScore = localStorage.getItem('rhythmTilesHighScore') || 0;
    let gameActive = false;
    let gameInterval;
    let beatmapIndex = 0;
    let currentBeatmap = [];
    let currentSpeed = 0;
    let player;
    let audioContext;

    // --- Song Configuration ---
    const songs = [
        {
            title: 'Easy Ride',
            artist: 'Chill Mix',
            videoId: 'jfKfPfyJRdk', // A non-copyright lofi track
            speed: 3, // Slower speed
            beatmap: generateRandomBeatmap(150)
        },
        {
            title: 'Upbeat Fun',
            artist: 'Pop Track',
            videoId: '3jWRrafhO7M', // A non-copyright upbeat track
            speed: 4,
            beatmap: generateRandomBeatmap(200)
        },
        {
            title: 'Fast Lane',
            artist: 'Electronic',
            videoId: 'sigGBpd1n1w', // A non-copyright fast track
            speed: 5.5, // Faster speed
            beatmap: generateRandomBeatmap(250)
        }
    ];

    // --- YouTube Player Setup ---
    window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player('player', {
            height: '1', 
            width: '1',
            playerVars: {
                'playsinline': 1,
                'controls': 0,
                'disablekb': 1
            },
            events: {
                'onReady': onPlayerReady
            }
        });
    };

    function onPlayerReady(event) {
        // Player is ready, but we wait for user to select a song.
    }

    function loadAndPlayVideo(videoId) {
        if (player && typeof player.loadVideoById === 'function') {
            player.loadVideoById(videoId);
            setTimeout(() => player.playVideo(), 1000); // Delay to allow loading
        }
    }

    // --- Game Logic ---
    function init() {
        highScoreDisplay.textContent = highScore;
        setupEventListeners();
        populateSongList();
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('Web Audio API is not supported in this browser');
        }
    }

    function setupEventListeners() {
        gameBoard.addEventListener('mousedown', handleTap);
        gameBoard.addEventListener('touchstart', handleTap, { passive: false });
        restartButton.addEventListener('click', resetToSongSelection);
    }
    
    function populateSongList() {
        songs.forEach((song, index) => {
            const button = document.createElement('button');
            button.className = 'song-button w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300';
            button.innerHTML = `<span class='block text-lg'>${song.title}</span><span class='block text-sm text-gray-500'>${song.artist}</span>`;
            button.onclick = () => selectSong(index);
            songListContainer.appendChild(button);
        });
    }

    function selectSong(songIndex) {
        const selectedSong = songs[songIndex];
        currentBeatmap = selectedSong.beatmap;
        currentSpeed = selectedSong.speed;
        
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        loadAndPlayVideo(selectedSong.videoId);
        startGame();
    }

    function startGame() {
        gameActive = true;
        score = 0;
        beatmapIndex = 0;
        updateScoreDisplay();
        gameInterval = setInterval(spawnTileFromBeatmap, 400); // Spawn tiles based on a rhythm
        requestAnimationFrame(gameLoop);
    }

    function spawnTileFromBeatmap() {
        if (!gameActive || beatmapIndex >= currentBeatmap.length) return;

        const laneIndex = currentBeatmap[beatmapIndex];
        if (laneIndex >= 0 && laneIndex < 4) {
            createTile(laneIndex);
        }
        beatmapIndex++;
    }

    function createTile(laneIndex) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.style.height = '120px'; // Fixed height for tiles
        tile.style.top = '-120px';
        tile.dataset.lane = laneIndex;

        const lane = gameBoard.children[laneIndex];
        lane.appendChild(tile);
    }

    function gameLoop(timestamp) {
        if (!gameActive) return;

        moveTiles();
        requestAnimationFrame(gameLoop);
    }

    function moveTiles() {
        const tiles = document.querySelectorAll('.tile');
        const speedIncrement = score / 200; // Speed increases with score
        const effectiveSpeed = currentSpeed + speedIncrement;

        tiles.forEach(tile => {
            const top = parseFloat(tile.style.top);
            tile.style.top = `${top + effectiveSpeed}px`;

            if (top > gameBoard.offsetHeight) {
                tile.remove();
                endGame('miss');
            }
        });
    }

    function handleTap(e) {
        if (!gameActive) return;
        e.preventDefault();
        
        const touch = e.touches ? e.touches[0] : e;
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        const lane = targetElement.closest('.lane');
        if (!lane) return;

        const laneIndex = Array.from(gameBoard.children).indexOf(lane);
        const tilesInLane = lane.querySelectorAll('.tile');
        const tapZoneBottom = gameBoard.offsetHeight;
        const tapZoneTop = tapZoneBottom - 96; // Height of tap zone

        let tileTapped = false;
        tilesInLane.forEach(tile => {
            const tileTop = tile.offsetTop;
            const tileBottom = tileTop + tile.offsetHeight;
            if (tileBottom > tapZoneTop && tileTop < tapZoneBottom) {
                tile.classList.add('tapped');
                setTimeout(() => tile.remove(), 200);
                score++;
                updateScoreDisplay();
                playTapSound();
                tileTapped = true;
            }
        });

        if (!tileTapped) {
            // Optional: penalty for tapping empty lane
            // endGame('mistap');
        }
    }

    function playTapSound() {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }

    function updateScoreDisplay() {
        scoreDisplay.textContent = score;
    }

    function endGame() {
        if (!gameActive) return; 
        gameActive = false;
        clearInterval(gameInterval);
        if (player && typeof player.stopVideo === 'function') {
            player.stopVideo();
        }

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('rhythmTilesHighScore', highScore);
            highScoreDisplay.textContent = highScore;
        }

        finalScoreDisplay.textContent = score;
        gameOverScreen.classList.remove('hidden');
        
        // Clear remaining tiles
        setTimeout(() => {
            document.querySelectorAll('.tile').forEach(t => t.remove());
        }, 300);
    }

    function resetToSongSelection() {
        gameOverScreen.classList.add('hidden');
        gameScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    }

    // --- Utility Functions ---
    function generateRandomBeatmap(length) {
        const map = [];
        let lastLane = -1;
        for (let i = 0; i < length; i++) {
            let nextLane;
            do {
                nextLane = Math.floor(Math.random() * 4);
            } while (nextLane === lastLane); // Avoid same lane twice in a row
            map.push(nextLane);
            lastLane = nextLane;
        }
        return map;
    }

    // --- Start the application ---
    init();
});