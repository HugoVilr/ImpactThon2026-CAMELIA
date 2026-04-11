import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import "pdbe-molstar/build/pdbe-molstar-light.css";

interface ProteinViewerProps {
  /** The raw structure file contents as a string */
  structureData: string | null;
  onReadyChange?: (isReady: boolean) => void;
}

export interface ProteinViewerHandle {
  requestXrSession: (mode: "immersive-ar" | "immersive-vr") => Promise<void>;
}

type PDBeMolstarPluginInstance = {
  render: (target: HTMLElement, options: unknown) => Promise<void>;
  clear?: () => Promise<void> | void;
  plugin?: {
    clear?: () => Promise<void> | void;
    canvas3d?: {
      webgl?: {
        xr: {
          set: (session: XRSession | undefined, options?: { resolutionScale?: number }) => Promise<void>;
          end: () => Promise<void>;
          session?: XRSession;
        };
      };
    };
    canvas3dContext?: {
      webgl?: {
        xr: {
          set: (session: XRSession | undefined, options?: { resolutionScale?: number }) => Promise<void>;
          end: () => Promise<void>;
          session?: XRSession;
        };
      };
    };
  };
};

type PDBeMolstarPluginConstructor = new () => PDBeMolstarPluginInstance;

type MolstarWindow = Window & {
  PDBeMolstarPlugin?: PDBeMolstarPluginConstructor;
};

export const ProteinViewer = forwardRef<ProteinViewerHandle, ProteinViewerProps>(function ProteinViewer(
  { structureData, onReadyChange },
  ref
) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginInstanceRef = useRef<PDBeMolstarPluginInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onReadyChange?.(isReady);
  }, [isReady, onReadyChange]);

  useImperativeHandle(ref, () => ({
    async requestXrSession(mode) {
      const pluginInstance = pluginInstanceRef.current;
      const webgl =
        pluginInstance?.plugin?.canvas3d?.webgl ?? pluginInstance?.plugin?.canvas3dContext?.webgl;

      if (!pluginInstance || !webgl) {
        throw new Error("Protein viewer is not ready for XR.");
      }

      if (!navigator.xr) {
        throw new Error("WebXR is not available in this browser.");
      }

      const supported = await navigator.xr.isSessionSupported(mode);
      if (!supported) {
        throw new Error(`${mode === "immersive-ar" ? "AR" : "VR"} is not supported in this browser.`);
      }

      const session = await navigator.xr.requestSession(mode, {
        optionalFeatures: ["local-floor", "bounded-floor"],
      });

      await webgl.xr.set(session, { resolutionScale: 1 });
    },
  }), []);

  useEffect(() => {
    let isMounted = true;
    let blobUrl: string | null = null;

    const teardown = async () => {
      const currentInstance = pluginInstanceRef.current;
      const webgl =
        currentInstance?.plugin?.canvas3d?.webgl ?? currentInstance?.plugin?.canvas3dContext?.webgl;

      try {
        await webgl?.xr.end();
      } catch {
        // Ignore XR teardown issues during viewer cleanup.
      }

      try {
        await currentInstance?.clear?.();
      } catch {
        if (typeof currentInstance?.plugin?.clear === "function") {
          await currentInstance.plugin.clear();
        }
      }

      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
    };

    if (!structureData) {
      void teardown();
      setError(null);
      setIsLoading(true);
      setIsReady(false);
      return;
    }

    const loadMolstar = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setIsReady(false);

        // @ts-expect-error - pdbe-molstar does not provide typescript definitions for its build scripts
        await import("pdbe-molstar/build/pdbe-molstar-plugin.js");

        if (!isMounted) {
          return;
        }

        const PDBeMolstarPlugin = (window as MolstarWindow).PDBeMolstarPlugin;
        if (!PDBeMolstarPlugin) {
          throw new Error("Failed to load PDBeMolstarPlugin");
        }

        if (!pluginInstanceRef.current && viewerRef.current) {
          pluginInstanceRef.current = new PDBeMolstarPlugin();
        }

        const currentInstance = pluginInstanceRef.current;
        if (!currentInstance || !viewerRef.current) return;

        const blob = new Blob([structureData], { type: "text/plain" });
        blobUrl = URL.createObjectURL(blob);

        const isCif =
          structureData.includes("_audit_conform") || structureData.trim().startsWith("data_");

        const options = {
          customData: {
            url: blobUrl,
            format: isCif ? "cif" : "pdb",
            binary: false,
          },
          alphafoldView: true,
          bgColor: { r: 255, g: 255, b: 255 },
          hideControls: true,
          hideCanvasControls: [
            "selection",
            "animation",
            "controlToggle",
            "controlInfo"
          ]
        };

        await currentInstance.render(viewerRef.current, options);

        if (!isMounted) {
          return;
        }

        setIsLoading(false);
        setIsReady(true);
      } catch (err: any) {
        console.error("Error loading Molstar:", err);
        if (isMounted) {
          setError(err.message || "Failed to render structure");
          setIsLoading(false);
          setIsReady(false);
        }

        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }
      }
    };

    void loadMolstar();

    return () => {
      isMounted = false;
      setIsReady(false);
      void teardown();
    };
  }, [structureData]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#f9fafb", // Very light gray to match premium UI
        borderRadius: "0.5rem",
        overflow: "hidden"
      }}
    >
      {/* Loading State Spinner */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            background: "rgba(255, 255, 255, 0.8)",
            zIndex: 10
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e5e7eb",
              borderTop: "4px solid #3b82f6", // Blue color
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}
          />
          <style>
            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
          </style>
          <p style={{ marginTop: "1rem", color: "#6b7280", fontFamily: "sans-serif" }}>
            Loading 3D Structure...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fee2e2",
            color: "#b91c1c",
            padding: "1rem",
            textAlign: "center"
          }}
        >
          Failed to render structure: {error}
        </div>
      )}

      {/* Molstar Container */}
      <div 
        ref={viewerRef} 
        style={{ width: "100%", height: "100%" }} 
      />
    </div>
  );
});
