import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "diorama-cli-package-"));
const metadata = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
try {
  execFileSync("pnpm", ["--filter", "@bydiorama/ui", "pack", "--pack-destination", temporary], { cwd: root, stdio: "pipe" });
  const tarball = join(temporary, `bydiorama-ui-${metadata.version}.tgz`);
  const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const run = args => execFileSync("npm", ["exec", "--offline", "--yes", `--package=${tarball}`, "--", "bydiorama-ui", ...args], { cwd: temporary, encoding: "utf8" });
  writeFileSync(join(temporary, "package.json"), JSON.stringify({ name: "cli-smoke-consumer", private: true }));
  run(["init", "--src", "src"]);
  assert(existsSync(join(temporary, "ui.config.json")));
  assert(!existsSync(join(temporary, "components.json")), "Owned installation must work without shadcn configuration.");
  run(["add", "button", "--registry-path", root, "--revision", revision]);
  const button = join(temporary, "src/ui/button.tsx");
  assert(existsSync(button)); assert(existsSync(join(temporary, "src/lib/cn.ts")));
  assert(existsSync(join(temporary, "ui.lock.json")));
  const sync = JSON.parse(run(["sync", "--json", "--registry-path", root]));
  assert(sync.every(item => item.status === "current"));
  const edited = readFileSync(button, "utf8") + "\n// Consumer-owned edit.\n";
  writeFileSync(button, edited);
  run(["add", "button", "--registry-path", root, "--revision", revision]);
  assert.equal(readFileSync(button, "utf8"), edited);
  console.log("Packed npx CLI: owned init, dependency installation, provenance, sync and local edit preservation passed.");
} finally { rmSync(temporary, { recursive: true, force: true }); }
