import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));

const services = [
  { name: "API", port: 3000, url: "http://127.0.0.1:3000/api/health" },
  { name: "Website", port: 5173, url: "http://127.0.0.1:5173" },
  { name: "CMS", port: 5174, url: "http://127.0.0.1:5174" },
];

function isPortOpen(port) {
  return new Promise((resolveOpen) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (isOpen) => {
      socket.destroy();
      resolveOpen(isOpen);
    };

    socket.setTimeout(700);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

const portStates = await Promise.all(services.map(async (service) => ({
  ...service,
  open: await isPortOpen(service.port),
})));
const occupied = portStates.filter((service) => service.open);

if (occupied.length === services.length) {
  console.log("RSAC website, CMS, and API are already running:");
  for (const service of services) console.log(`- ${service.name}: ${service.url}`);
  process.exit(0);
}

if (occupied.length) {
  console.error("The RSAC stack cannot start because these ports are already in use:");
  for (const service of occupied) console.error(`- ${service.name}: port ${service.port}`);
  console.error("Stop the older process using those ports, then run npm run dev:all again.");
  process.exit(1);
}

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
    if (!stopping) stop(code || 1);
  });
  child.on("error", () => stop(1));
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
