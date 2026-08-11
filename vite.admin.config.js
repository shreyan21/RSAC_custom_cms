import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const reactRefreshPreamble = {
  name: "rsac-react-refresh-preamble",
  apply: "serve",
  transformIndexHtml() {
    return [{
      tag: "script",
      attrs: { type: "module" },
      injectTo: "head-prepend",
      children: [
        'import { injectIntoGlobalHook } from "/@react-refresh";',
        "injectIntoGlobalHook(window);",
        "window.$RefreshReg$ = () => {};",
        "window.$RefreshSig$ = () => (type) => type;",
      ].join("\n"),
    }];
  },
};

export default defineConfig(({ command }) => ({
  root: "admin",
  base: command === "build" ? "/cms/" : "/",
  cacheDir: "../node_modules/.vite-admin",
  plugins: [reactRefreshPreamble, react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:3000",
      "/uploads": "http://127.0.0.1:3000",
    },
  },
  build: { outDir: "../dist-admin", emptyOutDir: true },
}));
