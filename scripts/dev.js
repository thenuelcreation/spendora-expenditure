const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const serverDirectory = path.join(root, "server");
const serverEnvFile = path.join(serverDirectory, ".env");
if (!fs.existsSync(serverEnvFile)) {
  console.error("Backend configuration is missing. Copy server/.env.example to server/.env and set DATABASE_URL and JWT_SECRET.");
  process.exit(1);
}

const dotenv = require(path.join(serverDirectory, "node_modules", "dotenv"));
const serverEnv = dotenv.parse(fs.readFileSync(serverEnvFile));
const missingConfig = ["DATABASE_URL", "JWT_SECRET"]
  .filter((key) => !serverEnv[key]?.trim());
if (missingConfig.length) {
  console.error(`Backend configuration is incomplete. Set ${missingConfig.join(" and ")} in server/.env.`);
  process.exit(1);
}
if (serverEnv.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET in server/.env must contain at least 32 characters.");
  process.exit(1);
}

const commands = [
  {
    name: "api",
    cwd: serverDirectory,
    args: ["--watch", "src/index.js"],
  },
  {
    name: "web",
    cwd: path.join(root, "frontend"),
    args: [path.join("node_modules", "vite", "bin", "vite.js")],
  },
];
const children = [];
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
}

for (const command of commands) {
  const child = spawn(process.execPath, command.args, {
    cwd: command.cwd,
    stdio: "inherit",
  });
  children.push(child);
  child.on("error", (error) => {
    console.error(`[${command.name}] Could not start: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`[${command.name}] stopped${signal ? ` (${signal})` : ` with exit code ${code}`}.`);
      stop(code || 1);
    }
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
