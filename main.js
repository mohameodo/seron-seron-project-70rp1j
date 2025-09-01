document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const tilesContainer = document.getElementById('tiles-container');
    const scoreDisplay = document.getElementById('score-display');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const finalScore = document.getElementById('final-score');
    const tapSound = document.getElementById('tap-sound');
    const missSound = document.getElementById('miss-sound');

    let score = 0;
    let gameSpeed = 3; // Initial speed
    let gameInterval;
    let isGameOver = true;
    let tileRows = [];

    const TILE_HEIGHT = gameContainer.clientHeight / 4;

    function createTileRow(isInitial = false) {
        const row = document.createElement('div');
        row.classList.add('tile-row');
        row.style.height = `${TILE_HEIGHT}px`;
        
        const magicTileIndex = Math.floor(Math.random() * 4);
        for (let i = 0; i < 4; i++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            if (i === magicTileIndex) {
                tile.classList.add('magic');
            }
            row.appendChild(tile);
        }

        const topPosition = isInitial ? tileRows.length * TILE_HEIGHT : -TILE_HEIGHT;
        row.style.transform = `translateY(${topPosition}px)`;
        
        tilesContainer.appendChild(row);
        tileRows.push(row);

        row.addEventListener('click', handleTileClick);
    }

    function handleTileClick(event) {
        if (isGameOver) return;

        const clickedTile = event.target;
        const row = clickedTile.parentElement;

        if (!row.classList.contains('active-row')) {
             // Prevent clicking tiles that are not the bottom-most row
            if (tileRows.indexOf(row) !== tileRows.length - 1) return;
        }

        if (clickedTile.classList.contains('magic')) {
            score++;
            scoreDisplay.textContent = score;
            clickedTile.classList.remove('magic');
            clickedTile.classList.add('tapped');
            tapSound.currentTime = 0;
            tapSound.play();

            // Make this row inactive and prepare the next one
            row.classList.remove('active-row');
            if (tileRows.length > 0) {
                const nextRow = tileRows[tileRows.length - 1];
                if (nextRow) nextRow.classList.add('active-row');
            }

        } else {
            clickedTile.classList.add('missed');
            endGame();
        }
    }

    function moveTiles() {
        if (isGameOver) return;

        tileRows.forEach(row => {
            const currentY = parseFloat(row.style.transform.split('(')[1]);
            row.style.transform = `translateY(${currentY + gameSpeed}px)`;
        });

        const bottomRow = tileRows[0];
        if (bottomRow && parseFloat(bottomRow.style.transform.split('(')[1]) >= gameContainer.clientHeight) {
            if (bottomRow.querySelector('.magic')) {
                endGame();
                return;
            }
            tilesContainer.removeChild(bottomRow);
            tileRows.shift();
            createTileRow();
        }

        // Increase speed gradually
        gameSpeed += 0.005;
    }

    function startGame() {
        score = 0;
        gameSpeed = 3;
        isGameOver = false;
        scoreDisplay.textContent = score;
        tileRows = [];
        tilesContainer.innerHTML = '';

        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        scoreDisplay.classList.remove('hidden');

        for (let i = 0; i < 5; i++) { // Create initial rows to fill screen
            createTileRow(true);
        }
        
        // Set the bottom row as the first active row
        if(tileRows.length > 0) {
            tileRows[tileRows.length - 1].classList.add('active-row');
        }

        gameInterval = setInterval(moveTiles, 16); // ~60 FPS
    }

    function endGame() {
        if (isGameOver) return;
        isGameOver = true;
        clearInterval(gameInterval);
        missSound.currentTime = 0;
        missSound.play();

        finalScore.textContent = score;
        gameOverScreen.classList.remove('hidden');
        scoreDisplay.classList.add('hidden');

        const missedMagicTile = tilesContainer.querySelector('.magic');
        if (missedMagicTile) {
            missedMagicTile.classList.add('missed');
        }
    }

    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
});