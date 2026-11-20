const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const startBtn = document.getElementById('start-btn');
const phaseLabel = document.getElementById('phase-label');

// Настройки физики и мира
const GROUND_Y = 260;
const GRAVITY = 0.65;
const JUMP_FORCE = -11.5;

let gameRunning = false;
let score = 0;
let highScore = Number(localStorage.getItem('bitJumperHigh')) || 0;
highScoreEl.textContent = highScore;

let speed = 5.5;
let frameCount = 0;
let nextSpawnFrame = 60;

// Игрок (Импульс данных)
const player = {
    x: 90,
    y: GROUND_Y - 34,
    width: 34,
    height: 34,
    vy: 0,
    grounded: true,
    phase: true // true = синий (TRUE), false = желтый (FALSE)
};

let obstacles = [];
let particles = [];
let bgCodeLines = [];

// Инициализация фонового матричного кода
for (let i = 0; i < 18; i++) {
    bgCodeLines.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (GROUND_Y - 20),
        text: Math.random() > 0.5 ? '010011' : 'if(ok)',
        speed: 0.5 + Math.random() * 1
    });
}

// Простой синтезатор звуков
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// Действия игрока
function jump() {
    if (!gameRunning) return;
    if (player.grounded) {
        player.vy = JUMP_FORCE;
        player.grounded = false;
        playTone(360, 'sine', 0.12);
        spawnParticles(player.x + 17, player.y + 34, player.phase ? '#00f0ff' : '#ffd000', 6);
    }
}

function togglePhase() {
    if (!gameRunning) return;
    player.phase = !player.phase;
    phaseLabel.textContent = player.phase ? 'TRUE' : 'FALSE';
    phaseLabel.style.color = player.phase ? '#00f0ff' : '#ffd000';
    playTone(player.phase ? 520 : 420, 'triangle', 0.08);
    spawnParticles(player.x + 17, player.y + 17, player.phase ? '#00f0ff' : '#ffd000', 8);
}

// Частицы эффектов
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 20,
            color
        });
    }
}

// Генерация препятствий и бонусов
function spawnEntity() {
    const rand = Math.random();
    if (rand < 0.45) {
        // Красный баг (нужно перепрыгнуть)
        obstacles.push({
            type: 'bug',
            x: canvas.width + 20,
            y: GROUND_Y - 32,
            width: 32,
            height: 32,
            passed: false
        });
    } else if (rand < 0.8) {
        // Логический барьер (проходится только в совпадающей фазе)
        const reqPhase = Math.random() > 0.5;
        obstacles.push({
            type: 'gate',
            reqPhase: reqPhase,
            x: canvas.width + 20,
            y: GROUND_Y - 75,
            width: 24,
            height: 75,
            passed: false
        });
    } else {
        // Бонусный бит (+5 очков)
        obstacles.push({
            type: 'bit',
            x: canvas.width + 20,
            y: GROUND_Y - 75,
            width: 22,
            height: 22,
            collected: false
        });
    }
}

// Сброс и старт игры
function startGame() {
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.grounded = true;
    player.phase = true;
    phaseLabel.textContent = 'TRUE';
    phaseLabel.style.color = '#00f0ff';

    obstacles = [];
    particles = [];
    score = 0;
    speed = 5.5;
    frameCount = 0;
    nextSpawnFrame = 50;
    scoreEl.textContent = '0';

    overlay.classList.add('hidden');
    gameRunning = true;
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameRunning = false;
    playTone(130, 'sawtooth', 0.35);

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('bitJumperHigh', highScore);
        highScoreEl.textContent = highScore;
    }

    overlayTitle.textContent = 'RUNTIME ERROR! (СБОЙ)';
    overlayTitle.style.color = '#f85149';
    overlayDesc.innerHTML = `Процесс остановлен. Ваш счет: <b>${score}</b><br>Нажмите кнопку ниже или <b>Пробел</b> для перезапуска.`;
    startBtn.textContent = '↺ ПЕРЕЗАПУСТИТЬ';
    overlay.classList.remove('hidden');
}

// Основной игровой цикл
function gameLoop() {
    if (!gameRunning) return;

    frameCount++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Фон и сетка
    ctx.fillStyle = '#090c10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#16202e';
    ctx.font = '13px Consolas';
    bgCodeLines.forEach(line => {
        line.x -= line.speed;
        if (line.x < -60) line.x = canvas.width + 20;
        ctx.fillText(line.text, line.x, line.y);
    });

    // Линия шины данных (земля)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // 2. Физика игрока
    player.vy += GRAVITY;
    player.y += player.vy;
    if (player.y >= GROUND_Y - player.height) {
        player.y = GROUND_Y - player.height;
        player.vy = 0;
        player.grounded = true;
    }

    // Отрисовка игрока
    const pColor = player.phase ? '#00f0ff' : '#ffd000';
    ctx.fillStyle = pColor;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = '#090c10';
    ctx.font = 'bold 14px Consolas';
    ctx.fillText(player.phase ? '1' : '0', player.x + 13, player.y + 22);

    // 3. Спавн и обновление объектов
    if (frameCount >= nextSpawnFrame) {
        spawnEntity();
        // Плавное ускорение игры
        speed = Math.min(11, 5.5 + score * 0.05);
        nextSpawnFrame = frameCount + Math.floor(65 + Math.random() * 45 - speed * 2);
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= speed;

        if (obs.type === 'bug') {
            ctx.fillStyle = '#f85149';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Consolas';
            ctx.fillText('BUG', obs.x + 6, obs.y + 20);
        } else if (obs.type === 'gate') {
            const gColor = obs.reqPhase ? '#00f0ff' : '#ffd000';
            ctx.strokeStyle = gColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
            ctx.fillStyle = obs.reqPhase ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 208, 0, 0.2)';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        } else if (obs.type === 'bit' && !obs.collected) {
            ctx.fillStyle = '#3fb950';
            ctx.beginPath();
            ctx.arc(obs.x + 11, obs.y + 11, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#090c10';
            ctx.font = 'bold 12px Consolas';
            ctx.fillText('+5', obs.x + 4, obs.y + 15);
        }

        // Проверка столкновений (с небольшим отступом 4px для честности)
        const hit =
            player.x + 4 < obs.x + obs.width &&
            player.x + player.width - 4 > obs.x &&
            player.y + 4 < obs.y + obs.height &&
            player.y + player.height - 4 > obs.y;

        if (hit) {
            if (obs.type === 'bug') {
                gameOver();
                return;
            }
            if (obs.type === 'gate' && player.phase !== obs.reqPhase) {
                gameOver();
                return;
            }
            if (obs.type === 'bit' && !obs.collected) {
                obs.collected = true;
                score += 5;
                scoreEl.textContent = score;
                playTone(680, 'sine', 0.1);
                spawnParticles(obs.x + 11, obs.y + 11, '#3fb950', 10);
            }
        }

        // Начисление очков за пройденное препятствие
        if (!obs.passed && obs.type !== 'bit' && obs.x + obs.width < player.x) {
            obs.passed = true;
            score += 1;
            scoreEl.textContent = score;
        }

        // Удаление ушедших за экран объектов
        if (obs.x + obs.width < -20) {
            obstacles.splice(i, 1);
        }
    }

    // 4. Отрисовка частиц
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
        if (p.life <= 0) particles.splice(i, 1);
    }

    requestAnimationFrame(gameLoop);
}

// Управление с клавиатуры и мыши
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!gameRunning && !overlay.classList.contains('hidden')) {
            startGame();
        } else {
            jump();
        }
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') {
        e.preventDefault();
        togglePhase();
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) jump();
    if (e.button === 2) togglePhase();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());


