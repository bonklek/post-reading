import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import esbuild from "esbuild";

const outDir = resolve("dist/milxdy-package");
const manifest = JSON.parse(await readFile("milxdy/milxdy.app.json", "utf8"));

await rm(outDir, { recursive: true, force: true });
await mkdir(resolve(outDir, "dist"), { recursive: true });

await esbuild.build({
  entryPoints: [resolve("src/milxdy/content.ts")],
  outfile: resolve(outDir, manifest.contentEntry),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: false,
  logLevel: "info",
  define: {
    POST_READING_BUILD_PROFILE: JSON.stringify("milxdy-package"),
    POST_READING_BUILD_TARGET: JSON.stringify("milxdy"),
    POST_READING_VERSION: JSON.stringify(manifest.version),
  },
});

await copyFile("milxdy/milxdy.app.json", resolve(outDir, "milxdy.app.json"));
await copyFile("milxdy.compatibility.json", resolve(outDir, "milxdy.compatibility.json"));

console.log(`Built milXdy package ${manifest.id}@${manifest.version} in ${outDir}`);
