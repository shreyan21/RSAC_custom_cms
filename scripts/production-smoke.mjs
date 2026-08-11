import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const freePort = () => new Promise((resolvePort, reject) => {
  const probe = createServer();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const address = probe.address();
    probe.close(() => resolvePort(address.port));
  });
});

const port = await freePort();
const origin = `http://127.0.0.1:${port}`;
const output = [];
const child = spawn(process.execPath, [resolve("scripts/start-production.mjs")], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    CMS_PORT: String(port),
    CMS_HOST: "127.0.0.1",
    CMS_PUBLIC_URL: origin,
    CMS_ALLOWED_ORIGINS: origin,
    CMS_COOKIE_SECURE: "false",
    CMS_SERVE_BUILT_APPS: "true",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => output.push(chunk.toString()));
child.stderr.on("data", (chunk) => output.push(chunk.toString()));

const waitForHealth = async () => {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Production server exited early.\n${output.join("")}`);
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error(`Production server did not become healthy.\n${output.join("")}`);
};

const expectHtml = async (path, marker) => {
  const response = await fetch(`${origin}${path}`, { redirect: "follow" });
  const body = await response.text();
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html") || !body.includes(marker)) {
    throw new Error(`${path} did not return the expected React HTML shell (${response.status}).`);
  }
  return body;
};

const expectAsset = async (html, prefix) => {
  const matches = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  const asset = matches.find((value) => value.startsWith(prefix));
  if (!asset) throw new Error(`No built asset beginning with ${prefix} was found.`);
  const response = await fetch(`${origin}${asset}`);
  if (!response.ok) throw new Error(`Built asset ${asset} returned ${response.status}.`);
};

try {
  await waitForHealth();
  const websiteHtml = await expectHtml("/", '<div id="root"></div>');
  await expectHtml("/leadership", '<div id="root"></div>');
  const cmsHtml = await expectHtml("/cms/", "RSAC-UP Content Management");
  await expectAsset(websiteHtml, "/assets/");
  await expectAsset(cmsHtml, "/cms/assets/");
  console.log(`Production smoke passed on ${origin}: API, website routes, CMS and built assets.`);
} finally {
  if (child.exitCode === null) child.kill("SIGTERM");
}
