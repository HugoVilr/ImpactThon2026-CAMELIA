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
  phantomStructureData?: string | null;
  phantomEnabled?: boolean;
  onReadyChange?: (isReady: boolean) => void;
}

export interface ProteinViewerHandle {
  requestXrSession: (mode: "immersive-ar" | "immersive-vr") => Promise<void>;
  highlightResidues: (startResidue: number, endResidue: number) => void;
  clearHighlight: () => void;
  focusResidues: (startResidue: number, endResidue: number) => void;
}

type SubscriptionLike = {
  unsubscribe: () => void;
};

type PDBeMolstarPluginInstance = {
  render: (target: HTMLElement, options: unknown) => Promise<void>;
  clear?: () => Promise<void> | void;
  load?: (
    params: {
      url: string;
      format?: "mmcif" | "pdb";
      isBinary?: boolean;
      id?: string;
    },
    fullLoad?: boolean
  ) => Promise<void>;
  deleteStructure?: (structureNumberOrId?: number | string) => Promise<void>;
  visual?: {
    highlight?: (params: {
      data: Array<{ start_residue_number: number; end_residue_number: number }>;
      structureId?: string;
    }) => Promise<void> | void;
    clearHighlight?: () => Promise<void> | void;
    select?: (params: {
      data: Array<{
        start_residue_number?: number;
        end_residue_number?: number;
        color?: { r: number; g: number; b: number };
        opacity?: number;
      }>;
      structureId?: string;
    }) => Promise<void> | void;
    clearSelection?: (
      structureNumberOrId?: number | string,
      options?: { keepOpacity?: boolean }
    ) => Promise<void> | void;
    focus?: (
      selection: Array<{ start_residue_number: number; end_residue_number: number }>,
      structureNumberOrId?: number | string
    ) => Promise<void> | void;
  };
  plugin?: {
    clear?: () => Promise<void> | void;
    animationLoop?: {
      start: (options?: { immediate?: boolean }) => void;
      stop: (options?: { noDraw?: boolean }) => void;
    };
    canvas3d?: {
      animate: () => void;
      pause: (noDraw?: boolean) => void;
      xr?: {
        request: () => Promise<void>;
        isPresenting?: {
          value: boolean;
          subscribe: (listener: (isPresenting: boolean) => void) => SubscriptionLike;
        };
        end: () => Promise<void>;
      };
      webgl?: {
        xr: {
          end: () => Promise<void>;
          session?: XRSession;
        };
      };
    };
    canvas3dContext?: {
      webgl?: {
        xr: {
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

const MOLSTAR_DUPLICATE_SYMBOL_WARNING = "already added. Call removeSymbol/removeCustomProps re-adding the symbol.";
const MAIN_STRUCTURE_ID = "main";
const PHANTOM_STRUCTURE_ID = "phantom";
const PHANTOM_OPACITY = 0.3;

let activeMolstarWarningFilters = 0;
let originalConsoleWarn: typeof console.warn | null = null;

const installMolstarWarningFilter = (): (() => void) => {
  if (activeMolstarWarningFilters === 0) {
    originalConsoleWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const [firstArg] = args;
      if (typeof firstArg === "string" && firstArg.includes(MOLSTAR_DUPLICATE_SYMBOL_WARNING)) {
        return;
      }

      originalConsoleWarn?.(...args);
    };
  }

  activeMolstarWarningFilters += 1;

  return () => {
    activeMolstarWarningFilters = Math.max(0, activeMolstarWarningFilters - 1);

    if (activeMolstarWarningFilters === 0 && originalConsoleWarn) {
      console.warn = originalConsoleWarn;
      originalConsoleWarn = null;
    }
  };
};

export const ProteinViewer = forwardRef<ProteinViewerHandle, ProteinViewerProps>(function ProteinViewer(
  { structureData, phantomStructureData = null, phantomEnabled = false, onReadyChange },
  ref
) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginInstanceRef = useRef<PDBeMolstarPluginInstance | null>(null);
  const xrLoopRestoreRef = useRef<(() => void) | null>(null);
  const phantomBlobUrlRef = useRef<string | null>(null);
  const isPhantomLoadedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const revokePhantomBlobUrl = (blobUrl?: string | null) => {
    const targetUrl = blobUrl ?? phantomBlobUrlRef.current;

    if (!targetUrl) {
      return;
    }

    URL.revokeObjectURL(targetUrl);

    if (phantomBlobUrlRef.current === targetUrl) {
      phantomBlobUrlRef.current = null;
    }
  };

  const resolveStructureFormat = (rawStructureData: string): "mmcif" | "pdb" => (
    rawStructureData.includes("_audit_conform") || rawStructureData.trim().startsWith("data_")
      ? "mmcif"
      : "pdb"
  );

  useEffect(() => {
    onReadyChange?.(isReady);
  }, [isReady, onReadyChange]);

  useImperativeHandle(ref, () => ({
    highlightResidues(startResidue, endResidue) {
      const instance = pluginInstanceRef.current;
      if (instance && typeof instance.visual?.highlight === "function") {
        void instance.visual.clearHighlight?.();
        void instance.visual.highlight({
          data: [{
            start_residue_number: startResidue,
            end_residue_number: endResidue
          }],
          structureId: MAIN_STRUCTURE_ID,
        });
      } else if (instance && typeof instance.visual?.select === "function") {
        // Fallback if highlight is not available for some reason
        void instance.visual.clearSelection?.(MAIN_STRUCTURE_ID);
        void instance.visual.select({
          data: [{
            start_residue_number: startResidue,
            end_residue_number: endResidue,
            color: { r: 15, g: 118, b: 110 } 
          }],
          structureId: MAIN_STRUCTURE_ID,
        });
      }
    },
    clearHighlight() {
      const instance = pluginInstanceRef.current;
      if (instance && typeof instance.visual?.clearHighlight === "function") {
        void instance.visual.clearHighlight();
      }
      if (instance && typeof instance.visual?.clearSelection === "function") {
        void instance.visual.clearSelection(MAIN_STRUCTURE_ID);
      }
    },
    focusResidues(startResidue, endResidue) {
      const instance = pluginInstanceRef.current;
      if (instance && typeof instance.visual?.focus === "function") {
        void instance.visual.focus([{
          start_residue_number: startResidue,
          end_residue_number: endResidue
        }], MAIN_STRUCTURE_ID);
      }
    },
    async requestXrSession(mode) {
      const pluginInstance = pluginInstanceRef.current;
      const plugin = pluginInstance?.plugin;
      const canvas3d = plugin?.canvas3d;
      const canvasXr = canvas3d?.xr;

      if (!pluginInstance || !plugin || !canvas3d || !canvasXr) {
        throw new Error("Protein viewer is not ready for XR.");
      }

      if (!navigator.xr) {
        throw new Error("WebXR is not available in this browser.");
      }

      const supported = await navigator.xr.isSessionSupported(mode);
      if (!supported) {
        throw new Error(`${mode === "immersive-ar" ? "AR" : "VR"} is not supported in this browser.`);
      }

      const originalIsSessionSupported = navigator.xr.isSessionSupported.bind(navigator.xr);
      navigator.xr.isSessionSupported = async (requestedMode) =>
        requestedMode === mode ? originalIsSessionSupported(requestedMode) : false;

      try {
        xrLoopRestoreRef.current?.();
        plugin.animationLoop?.stop({ noDraw: true });

        await canvasXr.request();

        if (!canvas3d.xr?.isPresenting?.value) {
          plugin.animationLoop?.start({ immediate: true });
          throw new Error("XR session did not start.");
        }

        canvas3d.animate();

        const presentationSubscription = canvas3d.xr?.isPresenting?.subscribe((isPresenting) => {
          if (!isPresenting) {
            presentationSubscription?.unsubscribe();
            xrLoopRestoreRef.current = null;
            canvas3d.pause();
            plugin.animationLoop?.start({ immediate: true });
          }
        });

        xrLoopRestoreRef.current = () => {
          presentationSubscription?.unsubscribe();
          canvas3d.pause();
          plugin.animationLoop?.start({ immediate: true });
        };
      } finally {
        navigator.xr.isSessionSupported = originalIsSessionSupported;
      }
    },
  }), []);

  useEffect(() => {
    let isMounted = true;
    let blobUrl: string | null = null;

    const teardown = async () => {
      const currentInstance = pluginInstanceRef.current;
      xrLoopRestoreRef.current?.();
      xrLoopRestoreRef.current = null;
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

      revokePhantomBlobUrl();
      isPhantomLoadedRef.current = false;

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

        const options = {
          customData: {
            url: blobUrl,
            format: resolveStructureFormat(structureData) === "mmcif" ? "cif" : "pdb",
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

        const restoreConsoleWarn = installMolstarWarningFilter();
        try {
          await currentInstance.render(viewerRef.current, options);
        } finally {
          restoreConsoleWarn();
        }

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

  useEffect(() => {
    let cancelled = false;

    const removePhantom = async () => {
      const currentInstance = pluginInstanceRef.current;

      revokePhantomBlobUrl();

      if (!currentInstance || !isPhantomLoadedRef.current) {
        return;
      }

      try {
        await currentInstance.deleteStructure?.(PHANTOM_STRUCTURE_ID);
        isPhantomLoadedRef.current = false;
      } catch {
        // Ignore phantom cleanup issues during overlay changes.
      }
    };

    const syncPhantom = async () => {
      const currentInstance = pluginInstanceRef.current;

      if (!currentInstance || !isReady) {
        return;
      }

      await removePhantom();

      if (!phantomEnabled || !phantomStructureData) {
        return;
      }

      const phantomBlobUrl = URL.createObjectURL(new Blob([phantomStructureData], { type: "text/plain" }));
      phantomBlobUrlRef.current = phantomBlobUrl;

      try {
        await currentInstance.load?.({
          url: phantomBlobUrl,
          format: resolveStructureFormat(phantomStructureData),
          isBinary: false,
          id: PHANTOM_STRUCTURE_ID,
        }, false);

        if (cancelled) {
          try {
            await currentInstance.deleteStructure?.(PHANTOM_STRUCTURE_ID);
          } catch {
            // Silently ignore if deletion fails during cancellation.
          }
          isPhantomLoadedRef.current = false;
          revokePhantomBlobUrl(phantomBlobUrl);
          return;
        }

        isPhantomLoadedRef.current = true;

        await currentInstance.visual?.select?.({
          structureId: PHANTOM_STRUCTURE_ID,
          data: [{ opacity: PHANTOM_OPACITY }],
        });
      } catch (phantomError) {
        console.error("Error loading phantom overlay:", phantomError);
        try {
          await currentInstance.deleteStructure?.(PHANTOM_STRUCTURE_ID);
        } catch {
          // Silently ignore if deletion fails after a failed load.
        }
        isPhantomLoadedRef.current = false;
        revokePhantomBlobUrl(phantomBlobUrl);
      }
    };

    void syncPhantom();

    return () => {
      cancelled = true;
      void removePhantom();
    };
  }, [isReady, phantomEnabled, phantomStructureData, structureData]);

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
