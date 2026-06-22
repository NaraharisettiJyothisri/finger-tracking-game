/* ----------------------------------------------------
   Pulse Runner - HandTracker Module
   Encapsulates MediaPipe Hands tracking, video stream,
   smoothing filters, and error handlers.
   ---------------------------------------------------- */

export default class HandTracker {
  constructor(options = {}) {
    // Configurable parameters
    this.sensitivity = options.sensitivity || 50; // Slider value 1-100
    this.onUpdate = options.onUpdate || (() => {});
    this.onHandLost = options.onHandLost || (() => {});
    this.onHandDetected = options.onHandDetected || (() => {});
    this.onCameraReady = options.onCameraReady || (() => {});
    this.onError = options.onError || (() => {});

    // Elements
    this.videoElement = document.getElementById('webcamVideo');
    this.canvasElement = document.getElementById('trackerCanvas');
    this.canvasCtx = this.canvasElement.getContext('2d');

    // State Variables
    this.hands = null;
    this.stream = null;
    this.running = false;
    this.animationFrameId = null;
    this.lastProcessTime = 0;
    this.processInterval = 1000 / 25; // Limit detection to 25 FPS to save CPU

    // Tracking state
    this.isHandDetected = false;
    this.lastDetectedTime = 0;
    this.handLostThreshold = 2000; // 2 seconds

    // Coordinates (Smoothed & Raw)
    this.rawX = 0.5;
    this.rawY = 0.5;
    this.smoothedX = 0.5;
    this.smoothedY = 0.5;

    // MediaPipe Hands connector/drawing shortcuts
    this.drawConnectors = window.drawConnectors;
    this.drawLandmarks = window.drawLandmarks;
    this.HAND_CONNECTIONS = window.HAND_CONNECTIONS;
  }

  /**
   * Calculates the smoothing alpha based on sensitivity.
   * Higher sensitivity means higher alpha (less smoothing, more direct response).
   */
  getAlpha() {
    // Map sensitivity slider (1 - 100) to alpha (0.04 - 0.45)
    const minAlpha = 0.04;
    const maxAlpha = 0.45;
    return minAlpha + (this.sensitivity / 100) * (maxAlpha - minAlpha);
  }

  /**
   * Initializes the MediaPipe Hands object and camera
   */
  async init() {
    try {
      if (!window.Hands) {
        throw new Error("MediaPipe Hands library failed to load from CDN.");
      }

      // 1. Initialize MediaPipe Hands
      this.hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1, // 0 = low latency/lower accuracy, 1 = balanced
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.hands.onResults((results) => this.handleTrackingResults(results));

      // 2. Request webcam stream
      await this.setupCamera();
      
      this.running = true;
      this.onCameraReady();

      // Start processing loop
      this.lastProcessTime = performance.now();
      this.loop(this.lastProcessTime);

    } catch (err) {
      this.onError(err);
    }
  }

  /**
   * Requests webcam permissions and assigns stream to video element
   */
  async setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Your browser does not support webcam access APIs.");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        }
      });
      
      this.videoElement.srcObject = this.stream;
      
      // Wait for metadata to load so dimensions are correct
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          resolve();
        };
      });

      // Match canvas dimensions to video
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasElement.height = this.videoElement.videoHeight;

    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error("Camera permission denied. Please allow access to play.");
      } else {
        throw new Error(`Webcam initialization failed: ${err.message}`);
      }
    }
  }

  /**
   * Frame processing loop
   */
  async loop(timestamp) {
    if (!this.running) return;

    // Check if it is time to process a frame based on our throttled rate
    const elapsed = timestamp - this.lastProcessTime;
    if (elapsed >= this.processInterval) {
      if (this.videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
        try {
          await this.hands.send({ image: this.videoElement });
          this.lastProcessTime = timestamp;
        } catch (e) {
          console.error("MediaPipe detection error:", e);
        }
      }
    }

    // Check for hand loss timeout
    if (this.isHandDetected && (performance.now() - this.lastDetectedTime > this.handLostThreshold)) {
      this.isHandDetected = false;
      this.onHandLost();
    }

    // Smooth coordinate interpolation (runs at 60fps for silky movement)
    this.applySmoothing();

    // Call updates
    this.onUpdate({
      x: this.smoothedX,
      y: this.smoothedY,
      rawX: this.rawX,
      rawY: this.rawY,
      isDetected: this.isHandDetected
    });

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  /**
   * Process results returned by MediaPipe
   */
  handleTrackingResults(results) {
    this.canvasCtx.save();
    
    // Clear the overlay canvas
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    // If a hand is found
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Index finger tip is landmark 8
      const indexFingerTip = landmarks[8];
      
      // Update raw positions (MediaPipe coordinates are 0-1)
      this.rawX = indexFingerTip.x;
      this.rawY = indexFingerTip.y;
      
      if (!this.isHandDetected) {
        this.isHandDetected = true;
        // Snap smoothed values immediately on first detection to prevent flying across screen
        const alpha = this.getAlpha();
        const targetX = 1 - this.rawX; // Mirror X
        this.smoothedX = targetX;
        this.smoothedY = this.rawY;
        this.onHandDetected();
      }

      this.lastDetectedTime = performance.now();

      // Render video frames onto tracking monitor if canvas drawing tools are loaded
      if (this.drawConnectors && this.drawLandmarks) {
        // Draw the full skeletal hand
        this.drawConnectors(this.canvasCtx, landmarks, this.HAND_CONNECTIONS, {
          color: 'rgba(255, 255, 255, 0.45)',
          lineWidth: 2
        });

        this.drawLandmarks(this.canvasCtx, landmarks, {
          color: 'rgba(6, 182, 212, 0.6)',
          lineWidth: 1,
          radius: 3
        });

        // Draw a special glowing tracker ring on the index finger tip (index 8)
        const x = indexFingerTip.x * this.canvasElement.width;
        const y = indexFingerTip.y * this.canvasElement.height;
        
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(x, y, 10, 0, 2 * Math.PI);
        this.canvasCtx.fillStyle = 'rgba(217, 70, 239, 0.6)';
        this.canvasCtx.strokeStyle = '#06b6d4';
        this.canvasCtx.lineWidth = 3;
        this.canvasCtx.shadowBlur = 10;
        this.canvasCtx.shadowColor = '#06b6d4';
        this.canvasCtx.fill();
        this.canvasCtx.stroke();
      }
    } else {
      // Just mirror frame if no hand, but let loop handle timeout transition
    }

    this.canvasCtx.restore();
  }

  /**
   * Linear exponential smoothing algorithm (EMA)
   */
  applySmoothing() {
    if (!this.isHandDetected) return;

    const alpha = this.getAlpha();
    // Mirror X so movement aligns with user's perspective (moving hand left moves ship left)
    const targetX = 1 - this.rawX;
    const targetY = this.rawY;

    // Apply exponential filter
    this.smoothedX = this.smoothedX * (1 - alpha) + targetX * alpha;
    this.smoothedY = this.smoothedY * (1 - alpha) + targetY * alpha;

    // Keep within bounds [0, 1]
    this.smoothedX = Math.max(0, Math.min(1, this.smoothedX));
    this.smoothedY = Math.max(0, Math.min(1, this.smoothedY));
  }

  /**
   * Stop the tracking and camera
   */
  stop() {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.isHandDetected = false;
    
    // Clear overlay canvas
    if (this.canvasCtx) {
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
  }

  /**
   * Sets sensitivity slider value (1 - 100)
   */
  setSensitivity(val) {
    this.sensitivity = val;
  }
}
