export {};

declare global {
  type XRSessionMode = "immersive-ar" | "immersive-vr";

  interface XRSessionInit {
    optionalFeatures?: string[];
    requiredFeatures?: string[];
  }

  interface XRSession extends EventTarget {
    end(): Promise<void>;
  }

  interface XRSystem extends EventTarget {
    isSessionSupported(mode: XRSessionMode): Promise<boolean>;
    requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>;
  }

  interface Navigator {
    xr?: XRSystem;
  }
}
