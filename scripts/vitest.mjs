// Lance Vitest en transmettant les arguments reçus (run, --coverage, etc.).
//
// Windows : si le dossier courant commence par une lettre de lecteur en minuscule
// (« c:\… », fréquent dans le terminal VS Code et dans Git Bash), Vitest charge son
// runner deux fois sous deux chemins différents et toutes les suites échouent avec
// « Cannot read properties of undefined (reading 'config') ». La correction doit
// avoir lieu avant le chargement de Vitest : on relance donc Vitest dans un processus
// enfant dont le dossier courant a la lettre de lecteur en majuscule.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const cwd = process.cwd();
const normalizedCwd = /^[a-z]:/.test(cwd) ? cwd.charAt(0).toUpperCase() + cwd.slice(1) : cwd;

const require = createRequire(path.join(normalizedCwd, "package.json"));
const vitestBin = path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs");

const child = spawn(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  cwd: normalizedCwd,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
