document.addEventListener('DOMContentLoaded', () => {
    const startMenu = document.getElementById('start-menu');
    const gameScreen = document.getElementById('game-screen');
    const gameOverMenu = document.getElementById('game-over-menu');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    const restartBtn = document.getElementById('restart-btn');
    const scoreDisplay = document.getElementById('score-display');
    const finalScore = document.getElementById('final-score');
    const gameBoard = document.getElementById('game-board');

    let score = 0;
    let gameInterval;
    let gameSpeed;
    let animationDuration;
    let isGameOver = false;

    // Sound effect setup
    let audioContext;
    let tapSoundBuffer;

    function initAudio() {
        if (audioContext) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Create a simple synth tone buffer
        const sampleRate = audioContext.sampleRate;
        const duration = 0.1;
        const frameCount = sampleRate * duration;
        tapSoundBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
        const data = tapSoundBuffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
            const progress = i / frameCount;
            data[i] = Math.sin(2 * Math.PI * 660 * progress) * Math.exp(-progress * 5) * 0.5;
        }
    }

    function playTapSound() {
        if (!audioContext || !tapSoundBuffer) return;
        const source = audioContext.createBufferSource();
        source.buffer = tapSoundBuffer;
        source.connect(audioContext.destination);
        source.start();
    }

    const difficultySettings = {
        easy: { speed: 600, duration: 4 },
        medium: { speed: 450, duration: 3 },
        hard: { speed: 300, duration: 2.2 }
    };

    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const difficulty = btn.dataset.difficulty;
            startGame(difficulty);
        });
    });

    restartBtn.addEventListener('click', () => {
        gameOverMenu.classList.add('hidden');
        startMenu.style.display = 'block';
    });

    function startGame(difficulty) {
        initAudio();
        isGameOver = false;
        score = 0;
        scoreDisplay.textContent = score;
        gameSpeed = difficultySettings[difficulty].speed;
        animationDuration = difficultySettings[difficulty].duration;

        gameBoard.innerHTML = ''; // Clear previous tiles
        // Re-add lanes and tap zone
        gameBoard.innerHTML = `
            <div class="absolute inset-0 flex justify-around z-0">
                <div class="w-1/4 h-full border-r border-gray-200"></div>
                <div class="w-1/4 h-full border-r border-gray-200"></div>
                <div class="w-1/4 h-full border-r border-gray-200"></div>
                <div class="w-1/4 h-full"></div>
            </div>
            <div id="tap-zone" class="absolute bottom-0 left-0 w-full h-24 bg-gray-200/50 border-t-4 border-blue-400 z-10"></div>
        `;

        startMenu.style.display = 'none';
        gameScreen.classList.remove('hidden');

        gameInterval = setInterval(createTileRow, gameSpeed);
    }

    function createTileRow() {
        if (isGameOver) return;
        const row = document.createElement('div');
        row.classList.add('tile-row');

        const blackTileIndex = Math.floor(Math.random() * 4);

        for (let i = 0; i < 4; i++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.style.left = `${i * 25}%`;
            
            if (i === blackTileIndex) {
                tile.classList.add('black');
            }
            
            tile.classList.add('falling');
            // Gradually increase speed
            const currentDuration = Math.max(animationDuration - (score * 0.01), animationDuration * 0.5);
            tile.style.animationDuration = `${currentDuration}s`;
            
            row.appendChild(tile);
        }

        gameBoard.appendChild(row);

        // Remove row after it has passed
        setTimeout(() => {
            if (row.parentNode === gameBoard) {
                // Check if a black tile was missed
                const blackTile = row.querySelector('.black:not(.tapped)');
                if (blackTile) {
                    endGame();
                }
                gameBoard.removeChild(row);
            }
        }, animationDuration * 1000 + 100);
    }

    gameBoard.addEventListener('mousedown', handleTap);
    gameBoard.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTap(e);
    });

    function handleTap(e) {
        if (isGameOver) return;

        const target = e.target;
        if (target.classList.contains('black')) {
            playTapSound();
            score++;
            scoreDisplay.textContent = score;
            target.classList.remove('black'); // Make it untappable again
            target.classList.add('tapped', 'bg-gray-300'); // Visual feedback
        } else if (target.classList.contains('tile') && !target.classList.contains('tapped')) {
            // Tapped a white tile
            endGame();
        }
    }

    function endGame() {
        if (isGameOver) return;
        isGameOver = true;
        clearInterval(gameInterval);

        // Visual effect for game over
        gameBoard.style.filter = 'blur(5px)';

        setTimeout(() => {
            gameScreen.classList.add('hidden');
            gameOverMenu.classList.remove('hidden');
            finalScore.textContent = score;
            gameBoard.style.filter = 'none';
        }, 500);
    }
});