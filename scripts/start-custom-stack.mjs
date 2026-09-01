import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));

const services = [
  { name: "API", port: 3000, url: "http://127.0.0.1:3000/api/health", marker: "RSAC Custom CMS" },
  { name: "Website", port: 5173, url: "http://127.0.0.1:5173", marker: "RSAC-UP" },
  { name: "CMS", port: 5174, url: "http://127.0.0.1:5174", marker: "RSAC-UP Content Management" },
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

async function isExpectedService(service) {
  try {
    const response = await fetch(service.url, { signal: AbortSignal.timeout(2500) });
    return response.ok && (await response.text()).includes(service.marker);
  } catch {
    return false;
  }
}

const portStates = await Promise.all(services.map(async (service) => ({
  ...service,
  open: await isPortOpen(service.port),
})));
await Promise.all(portStates.map(async (service) => {
  service.expected = service.open && await isExpectedService(service);
}));
const conflicts = portStates.filter((service) => service.open && !service.expected);
if (conflicts.length) {
  console.error("The RSAC stack cannot start because another application is using:");
  for (const service of conflicts) console.error(`- port ${service.port} (needed by ${service.name})`);
  console.error("Stop that application, then run npm run dev:all again.");
  process.exit(1);
}
const occupied = portStates.filter((service) => service.expected);
const missing = portStates.filter((service) => !service.open);

if (occupied.length === services.length) {
  console.log("RSAC website, CMS, and API are already running:");
  for (const service of services) console.log(`- ${service.name}: ${service.url}`);
  process.exit(0);
}

if (occupied.length) {
  console.log("Keeping the RSAC services that are already running:");
  for (const service of occupied) console.log(`- ${service.name}: ${service.url}`);
  console.log("Starting the missing services:");
  for (const service of missing) console.log(`- ${service.name}: ${service.url}`);
}

const children = [
  !portStates.find((service) => service.name === "API").open
    ? spawn(process.execPath, [resolve(root, "server/index.js")], { cwd: root, stdio: "inherit" })
    : null,
  !portStates.find((service) => service.name === "Website").open
    ? spawn(process.execPath, [vite, "--host", "127.0.0.1", "--port", "5173", "--strictPort"], { cwd: root, stdio: "inherit" })
    : null,
  !portStates.find((service) => service.name === "CMS").open
    ? spawn(process.execPath, [vite, "--config", "vite.admin.config.js"], { cwd: root, stdio: "inherit" })
    : null,
].filter(Boolean);

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
