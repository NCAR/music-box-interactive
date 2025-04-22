import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    outDir: "app/dist/main",
    build: {
      lib: {
        entry: "app/main/main.js"
      }
    }
  },
  preload: {
    outDir: "app/dist/preload",
    build: {
      lib: {
        entry: "app/preload/preload.js"
      }
    }
  },
  renderer: {
    outDir: "app/dist/renderer",
    root: ".",
    plugins: [react()],
    build: {
      rollupOptions: {
        input: "./index.html"
      }
    }
  },
  // define: {
  //   "process.env.VITE_APP_VERSION": JSON.stringify(
  //     require("./package.json").version
  //   ),
  // },
});
