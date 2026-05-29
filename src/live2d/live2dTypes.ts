export interface MotionEntryLike {
  File?: string;
}

export type MotionGroupDefinitions = Record<string, MotionEntryLike[] | undefined>;

export interface Live2DModelLike {
  internalModel?: {
    motionManager?: {
      definitions?: MotionGroupDefinitions;
    };
  };
  originalWidth?: number;
  originalHeight?: number;
  width?: number;
  height?: number;
  motion?: (...args: any[]) => Promise<boolean> | Promise<void> | boolean | void;
  setParamFloat?: (name: string, value: number) => void;
  focus?: (x: number, y: number, immediate?: boolean) => void;
  destroy?: () => void;
  anchor?: { set?: (x: number, y: number) => void };
  scale?: { set?: (x: number) => void };
  getLocalBounds?: () => { x: number; y: number; width: number; height: number };
  getBounds?: () => { x: number; y: number; width: number; height: number };
  x: number;
  y: number;
}

export interface PixiAppLike {
  renderer: { type?: number };
  stage: { addChild: (child: unknown) => void };
  ticker: { add: (fn: () => void) => void; stop?: () => void; start?: () => void };
  destroy?: (removeView?: boolean, options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }) => void;
}
