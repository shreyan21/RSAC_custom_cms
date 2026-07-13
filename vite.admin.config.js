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

export default defineConfig({
  root: "admin",
  plugins: [reactRefreshPreamble, react()],
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
  build: { outDir: "../dist-admin", emptyOutDir: true },
});
