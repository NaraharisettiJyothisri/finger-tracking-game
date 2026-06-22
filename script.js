/* ----------------------------------------------------
   Pulse Runner - Main Application Script
   Orchestrates UI screens, settings states, drag-and-drop
   monitors, and ties HandTracker events to Game updates.
   ---------------------------------------------------- */

import HandTracker from './handTracker.js';
import Game from './game.js';

// DOM Element Selectors
const uiOverlay = document.getElementById('uiOverlay');
const startScreen = document.getElementById('startScreen');
const loadingScreen = document.getElementById('loadingScreen');
const settingsScreen = document.getElementById('settingsScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');

const loadingText = document.getElementById('loadingText');
const loadingProgress = document.getElementById('loadingProgress');
const trackingLostBanner = document.getElementById('trackingLostBanner');
const webcamMonitor = document.getElementById('webcamMonitor');

// HUD Selectors
const hud = document.getElementById('hud');
const scoreVal = document.getElementById('scoreVal');
const shieldBarInner = document.getElementById('shieldBarInner');
const levelVal = document.getElementById('levelVal');
const multVal = document.getElementById('multVal');
const bestScoreVal = document.getElementById('bestScoreVal');

// Controls & Inputs
const startGameBtn = document.getElementById('startGameBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const cancelLoadingBtn = document.getElementById('cancelLoadingBtn');
const hudPauseBtn = document.getElementById('hudPauseBtn');
const resumeGameBtn = document.getElementById('resumeGameBtn');
const restartGameBtn = document.getElementById('restartGameBtn');
const pauseSettingsBtn = document.getElementById('pauseSettingsBtn');
const quitGameBtn = document.getElementById('quitGameBtn');
const retryGameBtn = document.getElementById('retryGameBtn');
const gameOverQuitBtn = document.getElementById('gameOverQuitBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

const webcamToggle = document.getElementById('webcamToggle');
const soundToggle = document.getElementById('soundToggle');
const sensitivitySlider = document.getElementById('sensitivitySlider');
const sensitivityVal = document.getElementById('sensitivityVal');
const diffTabs = document.querySelectorAll('.diff-tab');

// Stats Summary Overlays
const finalScoreVal = document.getElementById('finalScoreVal');
const finalTimeVal = document.getElementById('finalTimeVal');
const newHighScoreAlert = document.getElementById('newHighScoreAlert');

// Instance references
let tracker = null;
let game = null;
let currentActiveScreen = startScreen;
let gameSettings = {
  difficulty: 'medium',
  sound: true,
  sensitivity: 50,
  webcamEnabled: true
};

/**
 * Initialize on page load
 */
window.addEventListener('DOMContentLoaded', () => {
  loadSavedSettings();
  setupUIEventListeners();
  setupMonitorDragging();
  updateHighScoreDisplay();
});

/**
 * Loads values stored in LocalStorage or defaults
 */
function loadSavedSettings() {
  const saved = localStorage.getItem('pulse_runner_settings');
  if (saved) {
    try {
      gameSettings = { ...gameSettings, ...JSON.parse(saved) };
    } catch (e) {
      console.warn("Error parsing local settings:", e);
    }
  }

  // Update UI inputs to match configuration state
  webcamToggle.checked = gameSettings.webcamEnabled;
  soundToggle.checked = gameSettings.sound;
  sensitivitySlider.value = gameSettings.sensitivity;
  updateSensitivityText(gameSettings.sensitivity);

  // Set active difficulty tab
  diffTabs.forEach(tab => {
    if (tab.dataset.diff === gameSettings.difficulty) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Apply visibility to webcam monitor
  if (gameSettings.webcamEnabled) {
    webcamMonitor.classList.remove('hidden');
  } else {
    webcamMonitor.classList.add('hidden');
  }
}

/**
 * Saves current config state to local storage
 */
function saveSettings() {
  gameSettings.webcamEnabled = webcamToggle.checked;
  gameSettings.sound = soundToggle.checked;
  gameSettings.sensitivity = parseInt(sensitivitySlider.value);
  
  const activeTab = document.querySelector('.diff-tab.active');
  if (activeTab) {
    gameSettings.difficulty = activeTab.dataset.diff;
  }

  localStorage.setItem('pulse_runner_settings', JSON.stringify(gameSettings));

  // Sync active instances if initialized
  if (game) {
    game.setDifficulty(gameSettings.difficulty);
    game.setSoundEnabled(gameSettings.sound);
  }
  if (tracker) {
    tracker.setSensitivity(gameSettings.sensitivity);
  }

  // Toggle monitor window visibility
  if (gameSettings.webcamEnabled) {
    webcamMonitor.classList.remove('hidden');
  } else {
    webcamMonitor.classList.add('hidden');
  }
}

/**
 * Utility screen transition helper
 */
function showScreen(screen) {
  if (currentActiveScreen) {
    currentActiveScreen.classList.add('hidden');
    currentActiveScreen.classList.remove('active');
  }
  
  if (screen) {
    screen.classList.remove('hidden');
    screen.classList.add('active');
    uiOverlay.style.pointerEvents = 'auto';
  } else {
    // Hide overlay completely so the player can interact with the canvas
    uiOverlay.style.pointerEvents = 'none';
  }
  
  currentActiveScreen = screen;
}

/**
 * Updates high score banner
 */
function updateHighScoreDisplay() {
  const score = localStorage.getItem('pulse_runner_best') || 0;
  const formatted = String(score).padStart(5, '0');
  bestScoreVal.textContent = formatted;
}

/**
 * Configures slider description label
 */
function updateSensitivityText(val) {
  if (val < 30) {
    sensitivityVal.textContent = "Steady (Heavy Filtering)";
    sensitivityVal.style.color = "var(--color-grey)";
  } else if (val > 70) {
    sensitivityVal.textContent = "Instant (Raw Input)";
    sensitivityVal.style.color = "var(--color-pink)";
  } else {
    sensitivityVal.textContent = "Balanced";
    sensitivityVal.style.color = "var(--color-cyan)";
  }
}

/**
 * Register button clicking listeners
 */
function setupUIEventListeners() {
  // Main start sequence
  startGameBtn.addEventListener('click', () => {
    startSessionBootSequence();
  });

  openSettingsBtn.addEventListener('click', () => {
    showScreen(settingsScreen);
  });

  closeSettingsBtn.addEventListener('click', () => {
    saveSettings();
    if (game && game.running && game.isPaused) {
      showScreen(pauseScreen);
    } else {
      showScreen(startScreen);
    }
  });

  cancelLoadingBtn.addEventListener('click', () => {
    abortBootSequence();
  });

  // Settings inputs
  sensitivitySlider.addEventListener('input', (e) => {
    updateSensitivityText(parseInt(e.target.value));
  });

  diffTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      diffTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Pause interactions
  hudPauseBtn.addEventListener('click', () => {
    pauseGameSession();
  });

  resumeGameBtn.addEventListener('click', () => {
    resumeGameSession();
  });

  restartGameBtn.addEventListener('click', () => {
    restartGameSession();
  });

  pauseSettingsBtn.addEventListener('click', () => {
    showScreen(settingsScreen);
  });

  quitGameBtn.addEventListener('click', () => {
    quitGameSession();
  });

  // Game over buttons
  retryGameBtn.addEventListener('click', () => {
    showScreen(null);
    hud.classList.remove('hidden');
    game.start();
  });

  gameOverQuitBtn.addEventListener('click', () => {
    quitGameSession();
  });

  // Fullscreen toggle handler
  fullscreenBtn.addEventListener('click', () => {
    toggleFullscreen();
  });
}

/**
 * Draggable Webcam Overlay Window setup
 */
function setupMonitorDragging() {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  const header = webcamMonitor.querySelector('.monitor-header');

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    webcamMonitor.classList.remove('dragging-prevented');
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = webcamMonitor.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    // Switch to absolute coordinates for custom placement
    webcamMonitor.style.right = 'auto';
    webcamMonitor.style.bottom = 'auto';
    webcamMonitor.style.left = `${initialLeft}px`;
    webcamMonitor.style.top = `${initialTop}px`;
    
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    let targetX = initialLeft + dx;
    let targetY = initialTop + dy;

    // Boundaries constraints
    const maxBoundX = window.innerWidth - webcamMonitor.offsetWidth;
    const maxBoundY = window.innerHeight - webcamMonitor.offsetHeight;

    targetX = Math.max(0, Math.min(maxBoundX, targetX));
    targetY = Math.max(0, Math.min(maxBoundY, targetY));

    webcamMonitor.style.left = `${targetX}px`;
    webcamMonitor.style.top = `${targetY}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Keep responsive position correct during resizing
  window.addEventListener('resize', () => {
    if (webcamMonitor.style.left) {
      const rect = webcamMonitor.getBoundingClientRect();
      const maxBoundX = window.innerWidth - webcamMonitor.offsetWidth;
      const maxBoundY = window.innerHeight - webcamMonitor.offsetHeight;

      const correctedX = Math.max(0, Math.min(maxBoundX, rect.left));
      const correctedY = Math.max(0, Math.min(maxBoundY, rect.top));

      webcamMonitor.style.left = `${correctedX}px`;
      webcamMonitor.style.top = `${correctedY}px`;
    }
  });
}

/**
 * Triggers loading screen progress animations and starts HandTracker
 */
function startSessionBootSequence() {
  showScreen(loadingScreen);
  loadingText.textContent = "REQUESTING WEBCAM ACCESS...";
  loadingProgress.style.width = "15%";

  // Initialize Game Instance first to setup bindings
  if (!game) {
    game = new Game({
      onScoreChange: (score) => {
        scoreVal.textContent = String(score).padStart(5, '0');
        // Dynamic score multiplier
        const levelMult = (1 + (game.level - 1) * 0.5).toFixed(1);
        multVal.textContent = `${levelMult}x`;
      },
      onShieldChange: (shield) => {
        shieldBarInner.style.width = `${shield}%`;
        if (shield < 35) {
          shieldBarInner.classList.add('low');
        } else {
          shieldBarInner.classList.remove('low');
        }
      },
      onLevelChange: (level) => {
        levelVal.textContent = level;
      },
      onGameOver: (summary) => {
        handleGameOver(summary);
      }
    });

    // Apply settings
    game.setDifficulty(gameSettings.difficulty);
    game.setSoundEnabled(gameSettings.sound);
  }

  // Initialize Tracker
  if (!tracker) {
    tracker = new HandTracker({
      sensitivity: gameSettings.sensitivity,
      onCameraReady: () => {
        loadingProgress.style.width = "75%";
        loadingText.textContent = "COMPILING WEBCAM INPUTS...";
        
        setTimeout(() => {
          loadingProgress.style.width = "100%";
          setTimeout(() => {
            // Hide loading overlays, show HUD & start
            showScreen(null);
            hud.classList.remove('hidden');
            game.start();
          }, 300);
        }, 600);
      },
      onUpdate: (handState) => {
        if (game && game.running) {
          if (handState.isDetected) {
            game.updatePlayerPosition(handState.x, handState.y);
          }
        }
      },
      onHandLost: () => {
        if (game && game.running && !game.isPaused) {
          trackingLostBanner.classList.remove('hidden');
        }
      },
      onHandDetected: () => {
        trackingLostBanner.classList.add('hidden');
      },
      onError: (err) => {
        handleWebcamError(err);
      }
    });

    tracker.init();
  } else {
    // Already loaded previously, just resume camera and start game
    tracker.init().then(() => {
      showScreen(null);
      hud.classList.remove('hidden');
      game.start();
    }).catch(err => handleWebcamError(err));
  }
}

/**
 * Terminate tracking bootup operations
 */
function abortBootSequence() {
  if (tracker) {
    tracker.stop();
  }
  showScreen(startScreen);
}

/**
 * Handle system trackers errors and permissions denies
 */
function handleWebcamError(err) {
  console.error("Session Boot Error:", err);
  alert(`Boot Error: ${err.message}\n\nPlease check permissions and refresh.`);
  abortBootSequence();
}

/**
 * Pause the active session
 */
function pauseGameSession() {
  if (!game || !game.running || game.isPaused) return;
  game.pause();
  showScreen(pauseScreen);
  hud.classList.add('hidden');
  trackingLostBanner.classList.add('hidden');
}

/**
 * Resume current session
 */
function resumeGameSession() {
  if (!game || !game.running || !game.isPaused) return;
  showScreen(null);
  hud.classList.remove('hidden');
  game.resume();
  
  // Re-verify tracking display
  if (tracker && !tracker.isHandDetected) {
    trackingLostBanner.classList.remove('hidden');
  }
}

/**
 * Resets levels & scores in existing runs
 */
function restartGameSession() {
  showScreen(null);
  hud.classList.remove('hidden');
  game.start();
}

/**
 * Terminates run, clean registers, and goes to welcome page
 */
function quitGameSession() {
  if (game) {
    game.quit();
  }
  if (tracker) {
    tracker.stop();
  }
  
  hud.classList.add('hidden');
  trackingLostBanner.classList.add('hidden');
  updateHighScoreDisplay();
  showScreen(startScreen);
}

/**
 * Handle Game Over trigger from canvas
 */
function handleGameOver(summary) {
  // Hide HUD
  hud.classList.add('hidden');
  trackingLostBanner.classList.add('hidden');

  // Format statistics
  const formattedScore = String(summary.score).padStart(5, '0');
  finalScoreVal.textContent = formattedScore;

  // Format Elapsed Time
  const elapsedSecs = Math.floor(summary.timeMs / 1000);
  const mins = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
  const secs = String(elapsedSecs % 60).padStart(2, '0');
  finalTimeVal.textContent = `${mins}:${secs}`;

  // High Score Alert visibility
  if (summary.newHighScore) {
    newHighScoreAlert.classList.remove('hidden');
  } else {
    newHighScoreAlert.classList.add('hidden');
  }

  // Stop hand tracking stream to release webcam resources when not playing
  if (tracker) {
    tracker.stop();
  }

  // Transition screen
  showScreen(gameOverScreen);
}

/**
 * Handle full browser screen viewport request
 */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn(`Fullscreen error: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}
