/* ----------------------------------------------------
   Pulse Runner - Game Engine Module
   Implements canvas renderer, physics loop, collision
   detection, object pooling, and Web Audio synthesizers.
   ---------------------------------------------------- */

// Web Audio API Synthesizer for 8-bit dynamic retro sounds
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  }

  playCoin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880.00, now + 0.08); // A5
    osc1.frequency.setValueAtTime(1174.66, now + 0.16); // D6

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(293.66, now); // D4
    osc2.frequency.setValueAtTime(440.00, now + 0.08); // A4
    osc2.frequency.setValueAtTime(587.33, now + 0.16); // D5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  playHit() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playLevelUp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major scale

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.05, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.15);
    });
  }

  playPowerup() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.35);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playGameOver() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [349.23, 311.13, 277.18, 220.00]; // F4, Eb4, Db4, A3 (melodramatic descent)

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.15, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.35);
    });
  }
}

// Particle class for pools
class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.color = '';
    this.alpha = 1;
    this.decay = 0.02;
    this.size = 2;
  }

  spawn(x, y, color, size = 3, vxMult = 1, vyMult = 1) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 5 * vxMult;
    this.vy = (Math.random() - 0.5) * 5 * vyMult;
    this.color = color;
    this.alpha = 1;
    this.decay = 0.015 + Math.random() * 0.02;
    this.size = size;
  }

  update() {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
    if (this.alpha <= 0) {
      this.active = false;
    }
  }
}

// Obstacle class for pools
class Obstacle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.vx = 0;
    this.size = 20;
    this.type = 'asteroid'; // 'asteroid' or 'barrier'
    this.rotation = 0;
    this.rotSpeed = 0;
  }

  spawn(canvasWidth, baseSpeed, typeRatio) {
    this.active = true;
    this.type = Math.random() < typeRatio ? 'barrier' : 'asteroid';
    
    if (this.type === 'barrier') {
      this.size = 18 + Math.random() * 8; // Smaller but faster/wider
      this.x = Math.random() * (canvasWidth - 80) + 40;
      this.vx = (Math.random() - 0.5) * 3; // Swerves horizontal
    } else {
      this.size = 15 + Math.random() * 22; // Varied asteroid sizes
      this.x = Math.random() * (canvasWidth - 60) + 30;
      this.vx = (Math.random() - 0.5) * 1.5;
    }
    
    this.y = -this.size - 20;
    this.vy = (baseSpeed * (0.85 + Math.random() * 0.4));
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.04;
  }

  update(canvasWidth, canvasHeight, speedScale) {
    if (!this.active) return;
    
    this.x += this.vx * speedScale;
    this.y += this.vy * speedScale;
    this.rotation += this.rotSpeed * speedScale;

    // Bounce off boundary edges
    if (this.x - this.size < 0) {
      this.x = this.size;
      this.vx = -this.vx;
    } else if (this.x + this.size > canvasWidth) {
      this.x = canvasWidth - this.size;
      this.vx = -this.vx;
    }

    // Recycle if past the bottom boundary
    if (this.y - this.size > canvasHeight) {
      this.active = false;
    }
  }
}

// Collectible items for pools
class Collectible {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.size = 10;
    this.type = 'core'; // 'core', 'shield', 'slowmo'
    this.pulsePhase = 0;
  }

  spawn(canvasWidth, type) {
    this.active = true;
    this.type = type;
    this.size = type === 'core' ? 10 : 14;
    this.x = Math.random() * (canvasWidth - 60) + 30;
    this.y = -this.size - 20;
    this.vy = 2 + Math.random() * 1.5;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(canvasHeight, speedScale) {
    if (!this.active) return;
    
    this.y += this.vy * speedScale;
    this.pulsePhase += 0.08;

    if (this.y - this.size > canvasHeight) {
      this.active = false;
    }
  }
}

export default class Game {
  constructor(options = {}) {
    // Canvas config
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // UI Event Callbacks
    this.onScoreChange = options.onScoreChange || (() => {});
    this.onShieldChange = options.onShieldChange || (() => {});
    this.onLevelChange = options.onLevelChange || (() => {});
    this.onGameOver = options.onGameOver || (() => {});
    
    // Settings configuration defaults
    this.settings = {
      difficulty: 'medium', // 'easy', 'medium', 'hard'
      sound: true
    };

    // Synthesizer
    this.synth = new SoundSynth();

    // Game states
    this.running = false;
    this.isPaused = false;
    this.score = 0;
    this.level = 1;
    this.shield = 100;
    this.startTime = 0;
    this.pausedTimeAcc = 0; // accumulated pause time duration
    this.lastPauseStart = 0;
    this.timeScale = 1.0; // modified by slow motion powerup

    // Player position
    this.player = {
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.75,
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight * 0.75,
      radius: 20,
      invulnerable: false,
      invulnTime: 0,
      glowTrail: []
    };

    // Power-up durations
    this.powerups = {
      slowMo: { active: false, timer: 0, maxDuration: 5000 },
      shieldUp: { active: false }
    };

    // Screen Shake variables
    this.shake = {
      duration: 0,
      intensity: 0
    };

    // Background Drift variables
    this.bgGridOffset = 0;

    // Spawning parameters
    this.spawnTimers = {
      obstacle: 0,
      coin: 0,
      powerup: 0
    };

    // Preallocated pools to prevent Garbage Collection frame drops
    this.initPools();

    // Parallax Starfield initialization
    this.stars = [];
    this.initStarfield();

    // Bind resizing handler
    this.handleResize = () => this.resize();
    window.addEventListener('resize', this.handleResize);
    this.resize();
  }

  // Pre-allocation sizes
  initPools() {
    this.particlePoolSize = 250;
    this.particlePool = Array.from({ length: this.particlePoolSize }, () => new Particle());

    this.obstaclePoolSize = 35;
    this.obstaclePool = Array.from({ length: this.obstaclePoolSize }, () => new Obstacle());

    this.collectiblePoolSize = 20;
    this.collectiblePool = Array.from({ length: this.collectiblePoolSize }, () => new Collectible());
  }

  initStarfield() {
    this.stars = Array.from({ length: 65 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      speed: 0.8 + Math.random() * 2.5,
      size: 0.5 + Math.random() * 1.5,
      alpha: 0.2 + Math.random() * 0.8
    }));
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // Reposition stars properly
    this.stars.forEach((star) => {
      if (star.x > this.canvas.width) star.x = Math.random() * this.canvas.width;
      if (star.y > this.canvas.height) star.y = Math.random() * this.canvas.height;
    });

    // Reset player position if game is not started
    if (!this.running) {
      this.player.x = this.canvas.width / 2;
      this.player.y = this.canvas.height * 0.75;
      this.player.targetX = this.player.x;
      this.player.targetY = this.player.y;
    }
  }

  setDifficulty(difficulty) {
    this.settings.difficulty = difficulty;
  }

  setSoundEnabled(enabled) {
    this.settings.sound = enabled;
    this.synth.enabled = enabled;
  }

  /**
   * Spawns an item from particle pool
   */
  spawnParticles(x, y, color, count = 8, size = 3, vxMult = 1, vyMult = 1) {
    let spawned = 0;
    for (let i = 0; i < this.particlePoolSize; i++) {
      if (!this.particlePool[i].active) {
        this.particlePool[i].spawn(x, y, color, size, vxMult, vyMult);
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  /**
   * Spawns an obstacle
   */
  spawnObstacle() {
    let baseSpeed = 3.5;
    let typeRatio = 0.1; // Frequency of swerving barrier obstacles

    if (this.settings.difficulty === 'easy') {
      baseSpeed = 2.5;
      typeRatio = 0.05;
    } else if (this.settings.difficulty === 'hard') {
      baseSpeed = 5.0;
      typeRatio = 0.25;
    }

    // Scale obstacle speed based on stages/levels
    baseSpeed += (this.level - 1) * 0.6;

    for (let i = 0; i < this.obstaclePoolSize; i++) {
      if (!this.obstaclePool[i].active) {
        this.obstaclePool[i].spawn(this.canvas.width, baseSpeed, typeRatio);
        break;
      }
    }
  }

  /**
   * Spawns a collectible
   */
  spawnCollectible(type = 'core') {
    for (let i = 0; i < this.collectiblePoolSize; i++) {
      if (!this.collectiblePool[i].active) {
        this.collectiblePool[i].spawn(this.canvas.width, type);
        break;
      }
    }
  }

  /**
   * Restores game loop values to initial run values
   */
  start() {
    this.score = 0;
    this.level = 1;
    this.shield = 100;
    this.running = true;
    this.isPaused = false;
    this.startTime = performance.now();
    this.pausedTimeAcc = 0;
    this.timeScale = 1.0;

    // Reset player object
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height * 0.75;
    this.player.targetX = this.player.x;
    this.player.targetY = this.player.y;
    this.player.invulnerable = false;
    this.player.glowTrail = [];

    // Clear existing pooled items
    this.particlePool.forEach(p => p.active = false);
    this.obstaclePool.forEach(o => o.active = false);
    this.collectiblePool.forEach(c => c.active = false);

    this.powerups.slowMo.active = false;
    this.powerups.slowMo.timer = 0;

    // Reset spawners
    this.spawnTimers.obstacle = 0;
    this.spawnTimers.coin = 0;
    this.spawnTimers.powerup = 0;

    // Trigger Initial UI events
    this.onScoreChange(this.score);
    this.onShieldChange(this.shield);
    this.onLevelChange(this.level);

    // Initial audio initialize
    this.synth.init();

    // Start 60fps frame loop
    this.tick(performance.now());
  }

  pause() {
    if (!this.running || this.isPaused) return;
    this.isPaused = true;
    this.lastPauseStart = performance.now();
  }

  resume() {
    if (!this.running || !this.isPaused) return;
    this.isPaused = false;
    this.pausedTimeAcc += performance.now() - this.lastPauseStart;
    
    // Resume ticking
    this.tick(performance.now());
  }

  quit() {
    this.running = false;
    this.isPaused = false;
  }

  /**
   * Sets player coordinate targets sent by HandTracker
   */
  updatePlayerPosition(normalizedX, normalizedY) {
    if (!this.running || this.isPaused) return;
    // Map normalized coordinates directly to canvas pixel space
    this.player.targetX = normalizedX * this.canvas.width;
    this.player.targetY = normalizedY * this.canvas.height;
  }

  /**
   * Core Game Loop Tick
   */
  tick(timestamp) {
    if (!this.running || this.isPaused) return;

    this.update(timestamp);
    this.draw();

    requestAnimationFrame((t) => this.tick(t));
  }

  /**
   * State Updates
   */
  update(timestamp) {
    // 1. Slow Motion Powerup calculation
    if (this.powerups.slowMo.active) {
      this.timeScale = 0.45;
      const duration = timestamp - this.powerups.slowMo.timer;
      if (duration >= this.powerups.slowMo.maxDuration) {
        this.powerups.slowMo.active = false;
        this.timeScale = 1.0;
      }
    } else {
      this.timeScale = 1.0;
    }

    // 2. Adjust screen shake intensity decay
    if (this.shake.duration > 0) {
      this.shake.duration -= 16.67; // Assuming 60fps (~16.6ms per frame)
      this.shake.intensity *= 0.9;
    } else {
      this.shake.intensity = 0;
    }

    // 3. Interpolate Player Ship coordinates smoothly
    // Helps bridge any missing camera update frames without stuttering
    const followFactor = 0.22; // Speed player moves towards target index
    this.player.x += (this.player.targetX - this.player.x) * followFactor;
    this.player.y += (this.player.targetY - this.player.y) * followFactor;

    // Constrain player coordinates inside screen
    this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));

    // Exhast particle emitter trail
    if (Math.random() < 0.35) {
      this.spawnParticles(this.player.x, this.player.y + 15, 'rgba(6, 182, 212, 0.4)', 1, 2, 0.4, 1.2);
    }

    // Player Invulnerability check
    if (this.player.invulnerable && timestamp > this.player.invulnTime) {
      this.player.invulnerable = false;
    }

    // 4. Update Starfield
    this.stars.forEach(star => {
      star.y += star.speed * this.timeScale;
      if (star.y > this.canvas.height) {
        star.y = -5;
        star.x = Math.random() * this.canvas.width;
      }
    });

    // Drift vertical glow lines
    this.bgGridOffset = (this.bgGridOffset + 1.2 * this.timeScale) % 60;

    // 5. Spawn Handlers
    this.handleSpawns(timestamp);

    // 6. Update Entities (Obstacles, Collectibles, Particles)
    this.obstaclePool.forEach(obstacle => {
      obstacle.update(this.canvas.width, this.canvas.height, this.timeScale);
      if (obstacle.active && this.checkCollision(this.player, obstacle)) {
        this.handlePlayerHit(obstacle);
      }
    });

    this.collectiblePool.forEach(item => {
      item.update(this.canvas.height, this.timeScale);
      if (item.active && this.checkCollision(this.player, item)) {
        this.handleItemCollection(item);
      }
    });

    this.particlePool.forEach(p => p.update());
  }

  handleSpawns(timestamp) {
    // Spawn Obstacles
    const obstacleRate = this.settings.difficulty === 'easy' ? 1400 : (this.settings.difficulty === 'hard' ? 700 : 1000);
    // Speed up spawn rate as level increases
    const scaledRate = Math.max(350, obstacleRate - (this.level - 1) * 75);
    
    if (timestamp - this.spawnTimers.obstacle > scaledRate) {
      this.spawnObstacle();
      this.spawnTimers.obstacle = timestamp;
    }

    // Spawn Energy Cores
    if (timestamp - this.spawnTimers.coin > 1800) {
      this.spawnCollectible('core');
      this.spawnTimers.coin = timestamp;
    }

    // Spawn Powerups (Shield/SlowMo) occasionally
    if (timestamp - this.spawnTimers.powerup > 12000) {
      // Pick random powerup type
      const type = Math.random() < 0.6 ? 'slowmo' : 'shield';
      this.spawnCollectible(type);
      this.spawnTimers.powerup = timestamp;
    }
  }

  checkCollision(player, entity) {
    const dx = player.x - entity.x;
    const dy = player.y - entity.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (player.radius + entity.size);
  }

  handlePlayerHit(obstacle) {
    if (this.player.invulnerable) return;

    // Explode obstacle
    obstacle.active = false;
    this.spawnParticles(obstacle.x, obstacle.y, '#ef4444', 15, 4, 1.5, 1.5);
    
    // Screen shake trigger
    this.shake.duration = 250;
    this.shake.intensity = 15;

    // Damage amount based on difficulty
    let damage = 25;
    if (this.settings.difficulty === 'easy') damage = 15;
    if (this.settings.difficulty === 'hard') damage = 35;

    this.shield = Math.max(0, this.shield - damage);
    this.onShieldChange(this.shield);

    // Dynamic Sound
    this.synth.playHit();

    if (this.shield <= 0) {
      this.triggerGameOver();
    } else {
      // Temporary invuln buffer after hitting
      this.player.invulnerable = true;
      this.player.invulnTime = performance.now() + 1200;
    }
  }

  handleItemCollection(item) {
    item.active = false;
    
    if (item.type === 'core') {
      // Standard energy core score increase
      this.spawnParticles(item.x, item.y, '#06b6d4', 8, 3, 0.8, 0.8);
      
      let basePoints = 100;
      this.score += basePoints;
      this.onScoreChange(this.score);

      // Sound play
      this.synth.playCoin();

      // Check Level advancement milestones (every 1000 points)
      const nextLvl = Math.floor(this.score / 1200) + 1;
      if (nextLvl > this.level) {
        this.level = nextLvl;
        this.onLevelChange(this.level);
        this.synth.playLevelUp();
        
        // Visual splash glow particles
        this.spawnParticles(this.canvas.width/2, this.canvas.height/2, '#f97316', 30, 5, 2, 2);
      }

    } else if (item.type === 'shield') {
      // Recover full shields
      this.spawnParticles(item.x, item.y, '#22c55e', 12, 4, 1.0, 1.0);
      this.shield = 100;
      this.onShieldChange(this.shield);
      this.synth.playPowerup();

    } else if (item.type === 'slowmo') {
      // Slow obstacle velocities
      this.spawnParticles(item.x, item.y, '#f97316', 12, 4, 1.0, 1.0);
      this.powerups.slowMo.active = true;
      this.powerups.slowMo.timer = performance.now();
      this.synth.playPowerup();
    }
  }

  triggerGameOver() {
    this.running = false;
    this.synth.playGameOver();
    
    // Save high score locally
    const bestScore = localStorage.getItem('pulse_runner_best') || 0;
    let isNewHigh = false;
    if (this.score > parseInt(bestScore)) {
      localStorage.setItem('pulse_runner_best', this.score);
      isNewHigh = true;
    }

    const elapsedMs = performance.now() - this.startTime - this.pausedTimeAcc;
    
    // callback game over UI
    this.onGameOver({
      score: this.score,
      timeMs: elapsedMs,
      newHighScore: isNewHigh
    });
  }

  /**
   * Rendering Canvas
   */
  draw() {
    this.ctx.save();

    // 1. Apply Screen Shake effect if active
    if (this.shake.intensity > 0) {
      const dx = (Math.random() - 0.5) * this.shake.intensity;
      const dy = (Math.random() - 0.5) * this.shake.intensity;
      this.ctx.translate(dx, dy);
    }

    // 2. Base Canvas Clear
    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 3. Draw Parallax Space Stars
    this.ctx.fillStyle = '#ffffff';
    this.stars.forEach(star => {
      this.ctx.globalAlpha = star.alpha;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    // 4. Draw Ambient grid lanes
    this.drawBackgroundGrid();

    // 5. Draw Collectibles
    this.collectiblePool.forEach(item => {
      if (!item.active) return;

      const bounceOffset = Math.sin(item.pulsePhase) * 3;
      this.ctx.save();
      this.ctx.translate(item.x, item.y + bounceOffset);

      if (item.type === 'core') {
        // Inner glowing core
        const grad = this.ctx.createRadialGradient(0, 0, 1, 0, 0, item.size);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#22d3ee');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, item.size * 2.2, 0, Math.PI * 2);
        this.ctx.fillStyle = grad;
        this.ctx.fill();
        
        // Main particle
        this.ctx.beginPath();
        this.ctx.arc(0, 0, item.size, 0, Math.PI * 2);
        this.ctx.fillStyle = '#06b6d4';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.shadowColor = '#06b6d4';
        this.ctx.shadowBlur = 10;
        this.ctx.fill();
        this.ctx.stroke();
      } else if (item.type === 'shield') {
        // Green shield cross badge
        this.ctx.shadowColor = '#22c55e';
        this.ctx.shadowBlur = 12;
        this.ctx.fillStyle = '#22c55e';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        
        // Draw cross icon
        this.ctx.beginPath();
        this.ctx.arc(0, 0, item.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-3, -item.size + 6, 6, item.size * 2 - 12);
        this.ctx.fillRect(-item.size + 6, -3, item.size * 2 - 12, 6);
      } else if (item.type === 'slowmo') {
        // Orange clock badge
        this.ctx.shadowColor = '#f97316';
        this.ctx.shadowBlur = 12;
        this.ctx.fillStyle = '#f97316';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, item.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Clock indicator hands
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, -6);
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(4, 0);
        this.ctx.stroke();
      }
      this.ctx.restore();
    });

    // 6. Draw Obstacles
    this.obstaclePool.forEach(obstacle => {
      if (!obstacle.active) return;

      this.ctx.save();
      this.ctx.translate(obstacle.x, obstacle.y);
      this.ctx.rotate(obstacle.rotation);

      if (obstacle.type === 'barrier') {
        // Rectangular laser beam firewall
        this.ctx.shadowColor = '#d946ef';
        this.ctx.shadowBlur = 14;

        const width = obstacle.size * 2.5;
        const height = obstacle.size * 0.8;

        const grad = this.ctx.createLinearGradient(-width/2, 0, width/2, 0);
        grad.addColorStop(0, 'rgba(217, 70, 239, 0.2)');
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(1, 'rgba(217, 70, 239, 0.2)');

        this.ctx.fillStyle = grad;
        this.ctx.strokeStyle = '#d946ef';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.roundRect(-width/2, -height/2, width, height, 4);
        this.ctx.fill();
        this.ctx.stroke();
      } else {
        // Triangular jagged asteroid
        this.ctx.shadowColor = '#ef4444';
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.fillStyle = '#1e1b4b';
        this.ctx.lineWidth = 2.5;

        this.ctx.beginPath();
        const pts = 5;
        for (let i = 0; i < pts; i++) {
          const angle = (i / pts) * Math.PI * 2;
          const radiusScale = 0.85 + Math.random() * 0.25; // jaggedness
          const rx = Math.cos(angle) * obstacle.size * radiusScale;
          const ry = Math.sin(angle) * obstacle.size * radiusScale;
          if (i === 0) this.ctx.moveTo(rx, ry);
          else this.ctx.lineTo(rx, ry);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      }
      this.ctx.restore();
    });

    // 7. Draw Explosion/exhaust Particles
    this.particlePool.forEach(p => {
      if (!p.active) return;
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // 8. Draw Player Spaceship HUD
    this.drawPlayer();

    // 9. Slow Motion HUD indicator
    if (this.powerups.slowMo.active) {
      this.ctx.fillStyle = 'rgba(249, 115, 22, 0.12)';
      this.ctx.strokeStyle = '#f97316';
      this.ctx.lineWidth = 4;
      this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.fillStyle = '#f97316';
      this.ctx.font = `italic bold 12px ${this.settings.fontDisplay || 'Orbitron'}`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText("TIME DILATION IN EFFECT", this.canvas.width / 2, this.canvas.height - 30);
    }

    this.ctx.restore();
  }

  drawBackgroundGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)';
    this.ctx.lineWidth = 1;

    // Horizontal lines scrolling down
    const spacing = 50;
    for (let y = this.bgGridOffset; y < this.canvas.height; y += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    // Vertical columns
    for (let x = 0; x < this.canvas.width; x += spacing * 1.5) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawPlayer() {
    this.ctx.save();
    
    // Invulnerability blinking
    if (this.player.invulnerable) {
      // Toggle alpha rapid blink
      if (Math.floor(performance.now() / 80) % 2 === 0) {
        this.ctx.restore();
        return;
      }
    }

    this.ctx.translate(this.player.x, this.player.y);

    // Glowing outer aura
    const outerGrad = this.ctx.createRadialGradient(0, 0, 2, 0, 0, this.player.radius * 2.2);
    outerGrad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
    outerGrad.addColorStop(0.5, 'rgba(217, 70, 239, 0.15)');
    outerGrad.addColorStop(1, 'rgba(0,0,0,0)');

    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.player.radius * 2.2, 0, Math.PI * 2);
    this.ctx.fillStyle = outerGrad;
    this.ctx.fill();

    // Draw Vector Space Fighter
    this.ctx.shadowColor = '#06b6d4';
    this.ctx.shadowBlur = 12;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.fillStyle = '#0f172a';
    this.ctx.lineWidth = 2.5;

    this.ctx.beginPath();
    // Nose cone
    this.ctx.moveTo(0, -18);
    // Right wingtip
    this.ctx.lineTo(15, 12);
    // Rear engine dent
    this.ctx.lineTo(0, 5);
    // Left wingtip
    this.ctx.lineTo(-15, 12);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Shield status ring
    this.ctx.shadowColor = this.shield < 35 ? '#ef4444' : '#06b6d4';
    this.ctx.shadowBlur = 8;
    this.ctx.strokeStyle = this.shield < 35 ? '#ef4444' : '#06b6d4';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.player.radius + 4, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  destroy() {
    this.running = false;
    window.removeEventListener('resize', this.handleResize);
    this.stop();
  }

  stop() {
    this.running = false;
  }
}
