document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameBoard = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const finalScoreDisplay = document.getElementById('final-score');
    const speedDisplay = document.getElementById('speed-display');
    const playButton = document.getElementById('play-button');
    const playAgainButton = document.getElementById('play-again-button');
    const youtubeLinkInput = document.getElementById('youtube-link-input');
    const errorMessage = document.getElementById('error-message');

    let score = 0;
    let gameInterval;
    let spawnInterval;
    let baseSpeed = 3; // Initial speed in seconds for a tile to cross the screen
    let currentSpeed = baseSpeed;
    let gameRunning = false;
    let player;
    let audioContext;
    let heldTiles = {}; // Track held long tiles by lane

    // YouTube Player API setup
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
        console.log("YouTube API Ready");
    };

    function getYoutubeVideoId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playSound(type = 'tap') {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (type === 'tap') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A5
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.2);
        } else if (type === 'release') {
             oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(660, audioContext.currentTime); // E6
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.2);
        } else { // miss
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(110, audioContext.currentTime); // A2
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.3);
        }

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }

    function startGame(videoId) {
        score = 0;
        currentSpeed = baseSpeed;
        scoreDisplay.textContent = '0';
        speedDisplay.textContent = '1.0x';
        gameBoard.innerHTML = '<div class="lane"></div><div class="lane"></div><div class="lane"></div><div class="lane"></div>';
        heldTiles = {};
        
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        gameOverScreen.classList.remove('show');
        gameScreen.classList.remove('hidden');

        if (player && typeof player.destroy === 'function') {
            player.destroy();
        }
        
        player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { 'autoplay': 1, 'controls': 0, 'showinfo': 0, 'rel': 0, 'iv_load_policy': 3 },
            events: {
                'onReady': (event) => {
                    event.target.playVideo();
                    gameRunning = true;
                    spawnInterval = setInterval(spawnTile, 600); // Spawn rate
                },
                'onStateChange': (event) => {
                    if (event.data === YT.PlayerState.ENDED) {
                        endGame();
                    }
                }
            }
        });
    }

    function endGame() {
        if (!gameRunning) return;
        gameRunning = false;
        clearInterval(spawnInterval);
        if (player && typeof player.pauseVideo === 'function') {
            player.pauseVideo();
        }
        finalScoreDisplay.textContent = score;
        gameScreen.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
        setTimeout(() => gameOverScreen.classList.add('show'), 10);
    }

    function updateScore(points) {
        score += points;
        scoreDisplay.textContent = score;
        
        // Increase speed with score
        const speedMultiplier = 1 + Math.floor(score / 250) * 0.1;
        currentSpeed = baseSpeed / speedMultiplier;
        speedDisplay.textContent = `${speedMultiplier.toFixed(1)}x`;
    }

    function spawnTile() {
        if (!gameRunning) return;
        const lanes = gameBoard.querySelectorAll('.lane');
        const laneIndex = Math.floor(Math.random() * 4);
        const tile = document.createElement('div');
        tile.classList.add('tile');

        const isLong = Math.random() < 0.2; // 20% chance for a long tile
        let tileHeight = 100; // Default height for short tile

        if (isLong) {
            tile.classList.add('long');
            tileHeight = Math.floor(Math.random() * 150) + 200; // Random height for long tile
            tile.dataset.long = true;
        }
        
        tile.style.height = `${tileHeight}px`;
        tile.style.animationDuration = `${currentSpeed}s`;
        tile.dataset.lane = laneIndex;

        tile.addEventListener('animationend', () => {
            if (!tile.classList.contains('hit')) {
                playSound('miss');
                endGame();
            }
            tile.remove();
        });

        lanes[laneIndex].appendChild(tile);
    }

    function handlePress(e) {
        if (!gameRunning) return;
        const target = e.target;
        if (!target.classList.contains('tile')) return;

        const rect = target.getBoundingClientRect();
        const gameRect = gameContainer.getBoundingClientRect();
        const tapZoneTop = gameRect.bottom - gameRect.height * 0.25;

        if (rect.bottom > tapZoneTop) {
             target.classList.add('active');
            if (target.dataset.long) {
                heldTiles[target.dataset.lane] = target;
            } else {
                target.classList.add('hit');
                updateScore(10);
                playSound('tap');
            }
        }
    }

    function handleRelease(e) {
        if (!gameRunning) return;
        const lanes = Object.keys(heldTiles);
        if (lanes.length === 0) return;

        lanes.forEach(lane => {
            const tile = heldTiles[lane];
            if (tile) {
                const rect = tile.getBoundingClientRect();
                const gameRect = gameContainer.getBoundingClientRect();
                const tapZoneBottom = gameRect.bottom - 10;

                // Check if the top of the long tile has passed the tap zone
                if (rect.top > tapZoneBottom) {
                    tile.classList.add('hit');
                    updateScore(25); // More points for long tiles
                    playSound('release');
                } else {
                    // Released too early
                    playSound('miss');
                    endGame();
                }
                tile.classList.remove('active');
                delete heldTiles[lane];
            }
        });
    }

    playButton.addEventListener('click', () => {
        const videoId = getYoutubeVideoId(youtubeLinkInput.value);
        if (videoId) {
            errorMessage.textContent = '';
            initAudio();
            startGame(videoId);
        } else {
            errorMessage.textContent = 'Please enter a valid YouTube URL.';
        }
    });

    playAgainButton.addEventListener('click', () => {
        gameOverScreen.classList.remove('show');
        setTimeout(() => {
            gameOverScreen.classList.add('hidden');
            startScreen.classList.remove('hidden');
        }, 300);
    });

    gameBoard.addEventListener('mousedown', handlePress);
    gameBoard.addEventListener('touchstart', (e) => {
        e.preventDefault();
        Array.from(e.changedTouches).forEach(touch => {
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            if (element) handlePress({ target: element });
        });
    }, { passive: false });

    window.addEventListener('mouseup', handleRelease);
    window.addEventListener('touchend', handleRelease);
});