import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const children = [
  spawn(process.execPath, [resolve(root, "server/index.js")], { cwd: root, stdio: "inherit" }),
  spawn(process.execPath, [vite, "--host", "127.0.0.1", "--port", "5173", "--strictPort"], { cwd: root, stdio: "inherit" }),
  spawn(process.execPath, [vite, "--config", "vite.admin.config.js"], { cwd: root, stdio: "inherit" }),
];

let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  setTimeout(() => process.exit(code), 200);
};

for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping && code) stop(code);
  });
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
