import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/mainview"),
    },
  },
  root: "src/mainview",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/mainview/index.html"),
        bubble: path.resolve(__dirname, "src/mainview/bubble.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
