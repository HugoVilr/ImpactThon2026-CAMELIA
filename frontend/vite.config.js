import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    css: {
        postcss: "./postcss.config.cjs",
    },
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "https://api-mock-cesga.onrender.com",
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/api/, ""); },
            },
        },
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./src/test/setup.ts"
    }
});
