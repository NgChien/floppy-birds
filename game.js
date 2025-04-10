// Game variables
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const finalScoreElement = document.getElementById('final-score');
const highScoreElement = document.getElementById('high-score');
const tokensElement = document.getElementById('tokens');
const currentScoreElement = document.getElementById('current-score');
const ticketsLeftElement = document.getElementById('tickets-left');
const particlesContainer = document.getElementById('particles');
const gameOverParticlesContainer = document.getElementById('game-over-particles');

// Set canvas size
canvas.width = 400;
canvas.height = 600;

// Game state
let gameStarted = false;
let gameOver = false;
let score = 0;
let highScore = localStorage.getItem('flappyHighScore') || 0;
let tokens = 0;
let tickets = 0;
let animationFrameId;

// Bird properties
const bird = {
    x: 50,
    y: canvas.height / 2,
    width: 40,
    height: 30,
    velocity: 0,
    gravity: 0.5,
    jump: -10,
    rotation: 0
};

// Pipe properties
const pipes = [];
const pipeWidth = 60;
const pipeGap = 200;
const pipeSpeed = 2;
const pipeFrequency = 1500; // milliseconds
let lastPipeTime = 0;

// Background properties
const background = {
    x: 0,
    speed: 1
};

// Particle system
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
        this.size *= 0.98;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let particles = [];

// Create particles for menu
function createMenuParticles() {
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 3}s`;
        particlesContainer.appendChild(particle);
    }
}

// Create particles for game over
function createGameOverParticles() {
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 3}s`;
        gameOverParticlesContainer.appendChild(particle);
    }
}

// Load images
const birdImg = new Image();
birdImg.src = 'bird.png';

const backgroundImg = new Image();
backgroundImg.src = 'background.png';

const pipeTopImg = new Image();
pipeTopImg.src = 'pipe-top.png';

const pipeBottomImg = new Image();
pipeBottomImg.src = 'pipe-bottom.png';

// Game functions
function startGame() {
    if (tickets <= 0) {
        alert('You need tickets to play! Please buy more tickets.');
        return;
    }
    
    gameStarted = true;
    gameOver = false;
    score = 0;
    tokens = 0;
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes.length = 0;
    particles.length = 0;
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    lastPipeTime = Date.now();
    tickets--;
    updateUI();
    gameLoop();
}

function endGame() {
    gameStarted = false;
    gameOver = true;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
    }
    tokens = score * 100; // 100 FLP tokens per point
    finalScoreElement.textContent = score;
    highScoreElement.textContent = highScore;
    tokensElement.textContent = tokens;
    gameOverScreen.style.display = 'flex';
    createGameOverParticles();
    cancelAnimationFrame(animationFrameId);
    updateUI();
}

function createPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - pipeGap - minHeight;
    const height = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

    pipes.push({
        x: canvas.width,
        topHeight: height,
        bottomY: height + pipeGap,
        passed: false
    });
}

function updateBird() {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
    bird.rotation = Math.min(Math.PI/4, Math.max(-Math.PI/4, bird.velocity * 0.1));

    // Check collision with ground or ceiling
    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        endGame();
    }
}

function updatePipes() {
    const currentTime = Date.now();
    if (currentTime - lastPipeTime > pipeFrequency) {
        createPipe();
        lastPipeTime = currentTime;
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= pipeSpeed;

        // Check if pipe is passed
        if (!pipes[i].passed && pipes[i].x + pipeWidth < bird.x) {
            pipes[i].passed = true;
            score++;
            // Create particles when scoring
            for (let j = 0; j < 10; j++) {
                particles.push(new Particle(bird.x, bird.y));
            }
        }

        // Check collision with pipes
        if (
            bird.x + bird.width > pipes[i].x &&
            bird.x < pipes[i].x + pipeWidth &&
            (bird.y < pipes[i].topHeight || bird.y + bird.height > pipes[i].bottomY)
        ) {
            endGame();
        }

        // Remove pipes that are off screen
        if (pipes[i].x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function draw() {
    // Draw background
    ctx.drawImage(backgroundImg, background.x, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImg, background.x + canvas.width, 0, canvas.width, canvas.height);
    background.x -= background.speed;
    if (background.x <= -canvas.width) {
        background.x = 0;
    }

    // Draw pipes
    pipes.forEach(pipe => {
        ctx.drawImage(pipeTopImg, pipe.x, 0, pipeWidth, pipe.topHeight);
        ctx.drawImage(pipeBottomImg, pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
    });

    // Draw bird with rotation
    ctx.save();
    ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);
    ctx.rotate(bird.rotation);
    ctx.drawImage(birdImg, -bird.width/2, -bird.height/2, bird.width, bird.height);
    ctx.restore();

    // Draw particles
    particles.forEach(particle => particle.draw());

    // Draw score
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(score.toString(), canvas.width/2, 80);
}

function gameLoop() {
    if (!gameStarted) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updateBird();
    updatePipes();
    updateParticles();
    draw();

    animationFrameId = requestAnimationFrame(gameLoop);
}

function updateUI() {
    currentScoreElement.textContent = score;
    ticketsLeftElement.textContent = tickets;
}

function buyTickets(amount) {
    tickets += amount;
    updateUI();
}

// Event listeners
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameStarted) {
        bird.velocity = bird.jump;
    }
});

canvas.addEventListener('click', () => {
    if (gameStarted) {
        bird.velocity = bird.jump;
    }
});

// Initialize game
createMenuParticles();
updateUI();
highScoreElement.textContent = highScore; 