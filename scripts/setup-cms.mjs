import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendRoot = join(repoRoot, "backend", "directus");
const backendEnvPath = join(backendRoot, ".env");
const backendEnvExamplePath = join(backendRoot, ".env.example");
const frontendEnvPath = join(repoRoot, ".env.local");
const directusCliPath = join(
  backendRoot,
  "node_modules",
  "directus",
  "cli.js"
);
const force = process.argv.includes("--force");
const npmCommand =
  process.platform === "win32"
    ? process.env.ComSpec || "cmd.exe"
    : "npm";
const npmInstallArguments =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npm install"]
    : ["install"];
const npmRebuildArguments =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npm rebuild isolated-vm"]
    : ["rebuild", "isolated-vm"];

const parseEnv = (content) =>
  content.split(/\r?\n/).reduce((values, line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

    if (match) {
      values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }

    return values;
  }, {});

const run = (
  command,
  args,
  { cwd = repoRoot, env = process.env, input } = {}
) => {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    input,
    stdio:
      input === undefined
        ? "inherit"
        : ["pipe", "inherit", "inherit"],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}.`
    );
  }
};

const capture = (
  command,
  args,
  { cwd = repoRoot, env = process.env } = {}
) => {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${result.stderr.trim()}`
    );
  }

  return result.stdout.trim();
};

const commandExists = (command, args = ["--version"]) => {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "ignore",
  });
  return !result.error && result.status === 0;
};

const setEnvValues = (path, values) => {
  const existing = existsSync(path)
    ? readFileSync(path, "utf8").split(/\r?\n/)
    : [];
  const pending = new Map(Object.entries(values));
  const lines = existing
    .filter((line, index) => index < existing.length - 1 || line !== "")
    .map((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);

      if (!match || !pending.has(match[1])) {
        return line;
      }

      const value = pending.get(match[1]);
      pending.delete(match[1]);
      return `${match[1]}=${value}`;
    });

  if (lines.length && pending.size) {
    lines.push("");
  }

  pending.forEach((value, key) => lines.push(`${key}=${value}`));
  writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
};

const createInitialEnv = () => {
  const template = readFileSync(backendEnvExamplePath, "utf8")
    .replace(
      "replace-with-at-least-32-random-characters",
      randomBytes(32).toString("hex")
    )
    .replace(
      "replace-with-at-least-64-random-characters",
      randomBytes(64).toString("hex")
    )
    .replace(
      "replace-with-a-strong-admin-password",
      randomBytes(18).toString("base64url")
    );

  writeFileSync(backendEnvPath, template, "utf8");
};

if (!existsSync(backendEnvPath)) {
  createInitialEnv();
  throw new Error(
    "Created backend/directus/.env with generated application secrets. Set the PostgreSQL host, database, user, and password in that file, then rerun npm run cms:setup."
  );
}

const backendEnv = parseEnv(readFileSync(backendEnvPath, "utf8"));
const requiredValues = [
  "PUBLIC_URL",
  "DB_CLIENT",
  "DB_HOST",
  "DB_PORT",
  "DB_DATABASE",
  "DB_USER",
  "DB_PASSWORD",
  "KEY",
  "SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];
const invalidValues = requiredValues.filter(
  (key) =>
    !backendEnv[key] ||
    /replace-with|change-me/i.test(backendEnv[key])
);

if (invalidValues.length) {
  throw new Error(
    `Complete these values in backend/directus/.env: ${invalidValues.join(", ")}.`
  );
}

if (backendEnv.DB_CLIENT !== "pg") {
  throw new Error("DB_CLIENT must be pg for the PostgreSQL deployment.");
}

if (!commandExists("psql")) {
  throw new Error(
    "The PostgreSQL psql client is required on the deployment machine and must be available on PATH."
  );
}

const databaseCheckUser =
  backendEnv.DB_ADMIN_USER || backendEnv.DB_USER;
const databaseCheckPassword =
  backendEnv.DB_ADMIN_PASSWORD || backendEnv.DB_PASSWORD;
const escapedDatabaseName = backendEnv.DB_DATABASE.replaceAll("'", "''");
const databaseExists =
  capture(
    "psql",
    [
      "-h",
      backendEnv.DB_HOST,
      "-p",
      backendEnv.DB_PORT,
      "-U",
      databaseCheckUser,
      "-d",
      "postgres",
      "-Atc",
      `SELECT count(*) FROM pg_database WHERE datname = '${escapedDatabaseName}';`,
    ],
    {
      cwd: backendRoot,
      env: {
        ...process.env,
        PGPASSWORD: databaseCheckPassword,
      },
    }
  ) === "1";

if (!databaseExists) {
  if (!backendEnv.DB_ADMIN_USER || !backendEnv.DB_ADMIN_PASSWORD) {
    throw new Error(
      `${backendEnv.DB_DATABASE} does not exist. Temporarily set DB_ADMIN_USER and DB_ADMIN_PASSWORD in backend/directus/.env, then rerun npm run cms:setup.`
    );
  }

  if (!commandExists("createdb")) {
    throw new Error(
      "The PostgreSQL createdb client is required to create the missing CMS database."
    );
  }

  console.log(`Creating missing PostgreSQL database ${backendEnv.DB_DATABASE}...`);
  run(
    "createdb",
    [
      "-h",
      backendEnv.DB_HOST,
      "-p",
      backendEnv.DB_PORT,
      "-U",
      backendEnv.DB_ADMIN_USER,
      "-O",
      backendEnv.DB_USER,
      "-E",
      "UTF8",
      "-T",
      "template0",
      backendEnv.DB_DATABASE,
    ],
    {
      cwd: backendRoot,
      env: {
        ...process.env,
        PGPASSWORD: backendEnv.DB_ADMIN_PASSWORD,
      },
    }
  );
}

console.log("Installing the pinned standalone Directus service...");
run(npmCommand, npmInstallArguments, { cwd: backendRoot });
run(npmCommand, npmRebuildArguments, { cwd: backendRoot });

const serviceEnv = {
  ...process.env,
  ...backendEnv,
};

console.log("Bootstrapping Directus system tables and administrator...");
run(process.execPath, [directusCliPath, "bootstrap"], {
  cwd: backendRoot,
  env: serviceEnv,
});

const psqlConnectionArgs = [
  "-h",
  backendEnv.DB_HOST,
  "-p",
  backendEnv.DB_PORT,
  "-U",
  backendEnv.DB_USER,
  "-d",
  backendEnv.DB_DATABASE,
  "-v",
  "ON_ERROR_STOP=1",
];
const databaseEnv = {
  ...serviceEnv,
  PGPASSWORD: backendEnv.DB_PASSWORD,
};
const escapedAdminEmail = backendEnv.ADMIN_EMAIL.replaceAll("'", "''");
const adminExists = capture(
  "psql",
  [
    ...psqlConnectionArgs,
    "-Atc",
    `SELECT count(*) FROM directus_users WHERE lower(email) = lower('${escapedAdminEmail}');`,
  ],
  {
    cwd: backendRoot,
    env: databaseEnv,
  }
) === "1";

if (!adminExists) {
  const administratorRole = capture(
    "psql",
    [
      ...psqlConnectionArgs,
      "-Atc",
      "SELECT id FROM directus_roles WHERE name = 'Administrator' LIMIT 1;",
    ],
    {
      cwd: backendRoot,
      env: databaseEnv,
    }
  );

  if (!administratorRole) {
    throw new Error(
      "Directus is initialized but its Administrator role is missing."
    );
  }

  console.log("Repairing the missing initial Directus administrator...");
  run(
    process.execPath,
    [
      directusCliPath,
      "users",
      "create",
      "--email",
      backendEnv.ADMIN_EMAIL,
      "--password",
      backendEnv.ADMIN_PASSWORD,
      "--role",
      administratorRole,
    ],
    {
      cwd: backendRoot,
      env: serviceEnv,
    }
  );
}

console.log("Applying the RSAC content schema...");
run(
  "psql",
  psqlConnectionArgs,
  {
    cwd: backendRoot,
    env: databaseEnv,
    input: readFileSync(join(backendRoot, "postgres-schema.sql"), "utf8"),
  }
);

mkdirSync(join(backendRoot, "uploads"), { recursive: true });
mkdirSync(join(backendRoot, "extensions"), { recursive: true });

console.log("Starting Directus temporarily for Studio configuration and seeding...");
const directus = spawn(process.execPath, [directusCliPath, "start"], {
  cwd: backendRoot,
  env: serviceEnv,
  stdio: "inherit",
});

const publicDirectusUrl = String(backendEnv.PUBLIC_URL).replace(/\/+$/, "");
const healthHost =
  !backendEnv.HOST || backendEnv.HOST === "0.0.0.0"
    ? "127.0.0.1"
    : backendEnv.HOST;
const directusUrl = `http://${healthHost}:${backendEnv.PORT || "8055"}`;
let directusReady = false;

for (let attempt = 0; attempt < 60; attempt += 1) {
  if (directus.exitCode !== null) {
    break;
  }

  try {
    const response = await fetch(`${directusUrl}/server/health`);

    if (response.status < 500) {
      directusReady = true;
      break;
    }
  } catch {
    // Directus is still starting.
  }

  await new Promise((resolveWait) => setTimeout(resolveWait, 2000));
}

try {
  if (!directusReady) {
    throw new Error(`Directus did not become healthy at ${directusUrl}.`);
  }

  run(
    process.execPath,
    [
      join(repoRoot, "scripts", "directus-setup.mjs"),
      "all",
      ...(force ? ["--force"] : []),
    ],
    {
      cwd: repoRoot,
      env: {
        ...serviceEnv,
        DIRECTUS_URL: directusUrl,
      },
    }
  );
} finally {
  if (directus.exitCode === null) {
    directus.kill();
  }
}

setEnvValues(frontendEnvPath, {
  VITE_CMS_ENABLED: "true",
  VITE_CMS_URL: publicDirectusUrl,
});

console.log("");
console.log("Standalone CMS setup complete.");
console.log(`Directus Studio: ${publicDirectusUrl}/admin`);
console.log("The temporary setup server has now stopped.");
console.log("Start local development with: npm run dev");
console.log("For Directus Studio only, use: npm run cms:start");
