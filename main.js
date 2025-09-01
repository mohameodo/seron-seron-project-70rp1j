document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const finalScoreDisplay = document.getElementById('final-score');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');

    let score = 0;
    let gameInterval;
    let tileSpeed = 3;
    let tileRows = [];
    let isGameOver = true;
    let tapSound = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'+Array(1e3).join('1212'));

    const TILE_ROW_HEIGHT_PERCENT = 25;

    function createTileRow() {
        const tileRow = document.createElement('div');
        tileRow.classList.add('tile-row');
        tileRow.style.top = `-${TILE_ROW_HEIGHT_PERCENT}%`;

        const blackTileIndex = Math.floor(Math.random() * 4);

        for (let i = 0; i < 4; i++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            if (i === blackTileIndex) {
                tile.classList.add('black');
            } else {
                tile.classList.add('white');
            }
            tileRow.appendChild(tile);
        }
        gameBoard.appendChild(tileRow);
        tileRows.push(tileRow);
    }

    function moveTiles() {
        if (isGameOver) return;

        for (let i = tileRows.length - 1; i >= 0; i--) {
            const row = tileRows[i];
            const currentTop = parseFloat(row.style.top);
            row.style.top = `${currentTop + tileSpeed / 10}%`;

            if (currentTop > 100) {
                const blackTile = row.querySelector('.black');
                if (blackTile) { // Missed a black tile
                    gameOver(blackTile);
                    return;
                }
                row.remove();
                tileRows.splice(i, 1);
            }
        }
    }

    function updateScore() {
        score++;
        scoreDisplay.textContent = score;
        // Increase speed every 10 points
        if (score % 10 === 0) {
            tileSpeed += 0.2;
        }
    }

    function handleTileClick(e) {
        if (isGameOver) return;

        const tile = e.target;
        if (!tile.classList.contains('tile')) return;

        if (tile.classList.contains('black')) {
            tapSound.currentTime = 0;
            tapSound.play();
            tile.classList.remove('black');
            tile.classList.add('tapped');
            updateScore();
        } else if (tile.classList.contains('white')) {
            gameOver(tile);
        }
    }
    
    function gameOver(tappedTile) {
        if(isGameOver) return;
        isGameOver = true;
        clearInterval(gameInterval);
        
        if(tappedTile) {
            tappedTile.classList.add('missed');
        }

        finalScoreDisplay.textContent = score;
        gameOverScreen.style.display = 'flex';
    }

    function resetGame() {
        score = 0;
        tileSpeed = 3;
        isGameOver = false;
        tileRows = [];
        scoreDisplay.textContent = '0';
        gameBoard.innerHTML = '';
        gameOverScreen.style.display = 'none';
    }

    function startGame() {
        resetGame();
        startScreen.style.display = 'none';
        createTileRow(); // Start with one row
        gameInterval = setInterval(() => {
            if (!isGameOver) {
                const lastRow = tileRows[tileRows.length - 1];
                if (parseFloat(lastRow.style.top) >= 0) {
                    createTileRow();
                }
            }
        }, 5000 / tileSpeed);
        
        function gameLoop() {
            if(!isGameOver) {
                moveTiles();
                requestAnimationFrame(gameLoop);
            }
        }
        requestAnimationFrame(gameLoop);
    }

    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    gameBoard.addEventListener('mousedown', handleTileClick); // Use mousedown for faster response
});