import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve("dist/milxdy-package");
const sourceEntry = await readFile("src/milxdy/content.ts", "utf8");
const manifest = JSON.parse(await readFile(resolve(root, "milxdy.app.json"), "utf8"));
const compatibility = JSON.parse(await readFile(resolve(root, "milxdy.compatibility.json"), "utf8"));
const bundlePath = resolve(root, manifest.contentEntry);
const bundle = await readFile(bundlePath, "utf8");

const failures = [];
if (/from\s+["'][^"']*(?:milXdy|src\/platform|src\/apps)[^"']*["']/.test(sourceEntry)) {
  failures.push("package entry imports private milXdy source");
}
if (/\b(?:chrome|browser)\.runtime\.(?:sendMessage|connect)\b/.test(bundle)) {
  failures.push("package bundle bypasses context.sendMessage with direct runtime messaging");
}
if (compatibility.packageId !== manifest.id || compatibility.packageVersion !== manifest.version) {
  failures.push("manifest and compatibility contract identify different package versions");
}
if (compatibility.appSdk?.targetVersion !== manifest.sdk?.targetVersion) {
  failures.push("manifest and compatibility contract target different App SDK versions");
}
for (const name of ["boot", "disable", "dispose", "onSurface", "open", "close"]) {
  if (!new RegExp(`export\\s*\\{[^}]*\\b${name}\\b`, "s").test(bundle) && !new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`).test(bundle)) {
    failures.push(`bundle does not export lifecycle hook ${name}`);
  }
}
await stat(bundlePath);

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

const typecheck = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"], { stdio: "inherit" });
if (typecheck.status !== 0) process.exit(typecheck.status ?? 1);
console.log(`Verified public-SDK package ${manifest.id}@${manifest.version}`);
