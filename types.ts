
export enum GestureState {
  NONE = 'NONE',
  CHAOS = 'CHAOS',    // Equivalent to OPEN/Nebula
  FORMED = 'FORMED',  // Equivalent to FIST/Tree
  PINCH = 'PINCH',    // Photo Focus
  FIST = 'FORMED',    // Mapping for gesture detection
  OPEN = 'CHAOS'      // Mapping for gesture detection
}

export interface PhotoData {
  id: string;
  data: Uint8ClampedArray;
  w: number;
  h: number;
  aspect: number;
  url: string;
}

export interface HandData {
  state: GestureState;
  x: number;
  y: number;
  rotation: { x: number; y: number };
}
