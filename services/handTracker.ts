
import { GestureState, HandData } from '../types';

export class HandTracker {
  private hands: any;
  private camera: any = null;
  private onResultsCallback: (data: HandData) => void;

  constructor(videoElement: HTMLVideoElement, onResults: (data: HandData) => void) {
    this.onResultsCallback = onResults;
    
    // Resolve MediaPipe Hands constructor
    const MP_HANDS = (window as any).Hands || (window as any).hands?.Hands;
    
    // Resolve MediaPipe Camera constructor
    const MP_CAMERA = (window as any).Camera || (window as any).camera_utils?.Camera;

    if (!MP_HANDS) {
      console.error("Available globals:", Object.keys(window).filter(k => k.toLowerCase().includes('hand')));
      throw new Error("MediaPipe 'Hands' library not found. The script might still be loading or blocked.");
    }
    if (!MP_CAMERA) {
      console.error("Available globals:", Object.keys(window).filter(k => k.toLowerCase().includes('camera')));
      throw new Error("MediaPipe 'Camera' utility not found. The script might still be loading or blocked.");
    }

    console.log("HandTracker: Constructors found. Initializing...");
    
    try {
      this.hands = new MP_HANDS({
        locateFile: (file: string) => {
          // Use versionless URL or matching version for WASM files
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.hands.onResults(this.processResults.bind(this));

      this.camera = new MP_CAMERA(videoElement, {
        onFrame: async () => {
          try {
            await this.hands.send({ image: videoElement });
          } catch (e) {
            // Silently handle frame processing errors
          }
        },
        width: 640,
        height: 480,
      });
      
      console.log("HandTracker: Instance initialized successfully.");
    } catch (err: any) {
      throw new Error(`MediaPipe Runtime Setup Failed: ${err?.message || 'WASM initialization error'}`);
    }
  }

  public async start() {
    if (this.camera) {
      console.log("HandTracker: Requesting camera stream...");
      try {
        await this.camera.start();
        console.log("HandTracker: Stream active.");
      } catch (err: any) {
        throw new Error(`Camera Access Error: ${err?.message || 'Check browser permissions'}`);
      }
    }
  }

  public async stop() {
    if (this.camera) {
      await this.camera.stop();
    }
  }

  private processResults(results: any) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.onResultsCallback({ state: GestureState.NONE, x: 0.5, y: 0.5, rotation: { x: 0, y: 0 } });
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const pinchDist = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));

    const palmBase = landmarks[0];
    const tips = [8, 12, 16, 20];
    const avgTipDist = tips.reduce((acc, idx) => {
      const tip = landmarks[idx];
      return acc + Math.sqrt(Math.pow(tip.x - palmBase.x, 2) + Math.pow(tip.y - palmBase.y, 2));
    }, 0) / 4;

    let state = GestureState.NONE;
    if (pinchDist < 0.06) {
      state = GestureState.PINCH;
    } else if (avgTipDist < 0.16) {
      state = GestureState.FIST;
    } else if (avgTipDist > 0.38) {
      state = GestureState.OPEN;
    }

    this.onResultsCallback({
      state,
      x: landmarks[9].x,
      y: landmarks[9].y,
      rotation: { x: (landmarks[9].y - 0.5) * 0.4, y: (landmarks[9].x - 0.5) * 0.4 }
    });
  }
}
