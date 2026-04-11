import { useEffect, useRef, useState } from "react";
import "pdbe-molstar/build/pdbe-molstar-light.css";

interface ProteinViewerProps {
  /** The raw PDB file contents as a string */
  pdbData: string | null;
}

export function ProteinViewer({ pdbData }: ProteinViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If no data, reset.
    if (!pdbData) {
      if (pluginInstanceRef.current) {
        pluginInstanceRef.current.plugin.clear();
      }
      setIsLoading(true);
      return;
    }

    let isMounted = true;

    const loadMolstar = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import the viewer to avoid SSR/Vite dev server issues
        // The ES module is not cleanly exported, so we rely on importing the build script
        // which assigns PDBeMolstarPlugin to the global window object.
        // @ts-expect-error - pdbe-molstar does not provide typescript definitions for its build scripts
        await import("pdbe-molstar/build/pdbe-molstar-plugin.js");
        
        if (!isMounted) return;

        // Ensure the global exists
        // @ts-ignore
        const PDBeMolstarPlugin = window.PDBeMolstarPlugin;
        if (!PDBeMolstarPlugin) {
          throw new Error("Failed to load PDBeMolstarPlugin");
        }

        if (!pluginInstanceRef.current && viewerRef.current) {
          pluginInstanceRef.current = new PDBeMolstarPlugin();
        }

        const currentInstance = pluginInstanceRef.current;
        if (!currentInstance || !viewerRef.current) return;

        // Use Blob URL instead of Data URI for large files
        const blob = new Blob([pdbData], { type: "text/plain" });
        const blobUrl = URL.createObjectURL(blob);

        // Inspect the data to determine format 
        // The mock API might return mmCIF data even in the pdb_file field!
        const isCif = pdbData.includes("_audit_conform") || pdbData.trim().startsWith("data_");

        const options = {
          customData: {
            url: blobUrl,
            format: isCif ? "cif" : "pdb",
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

        currentInstance.render(viewerRef.current, options);
        setIsLoading(false);
        
        // Cleanup Blob URL after Molstar loads it
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      } catch (err: any) {
        console.error("Error loading Molstar:", err);
        if (isMounted) {
          setError(err.message || "Failed to render structure");
          setIsLoading(false);
        }
      }
    };

    loadMolstar();

    return () => {
      isMounted = false;
      // Ideally we would dispose the plugin, but wiping the DOM works too since it's a webgl canvas
      if (pluginInstanceRef.current) {
        // Safe disposal if available
        if (typeof pluginInstanceRef.current.plugin?.clear === "function") {
          pluginInstanceRef.current.plugin.clear();
        }
      }
    };
  }, [pdbData]);

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
}
