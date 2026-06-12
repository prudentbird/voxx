import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { exists } from "../../src/util";

const ROOT = join(import.meta.dirname, "../../../..");
const WEB_NM = join(ROOT, "apps/web/node_modules");
const CORE_TYPES = join(ROOT, "packages/core/dist/index.d.mts");

// Resolve the scaffold's imports against the monorepo's real packages.
// All `paths` targets are absolute, so no `baseUrl` is needed (TS 6
// deprecates it). `server-only` ships no type declarations, so it lives in
// AMBIENT below instead of fighting resolution here.
function compilerOptions(): ts.CompilerOptions {
  return {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    paths: {
      next: [join(WEB_NM, "next")],
      "next/*": [join(WEB_NM, "next/*")],
      react: [join(WEB_NM, "@types/react")],
      "react/jsx-runtime": [join(WEB_NM, "@types/react/jsx-runtime")],
      "react-dom": [join(WEB_NM, "@types/react-dom")],
      "@voxx/core": [CORE_TYPES],
      "@voxx/core/*": [join(ROOT, "packages/core/*")],
    },
  };
}

// CSS side-effect imports and untyped packages the scaffold relies on.
const AMBIENT = 'declare module "*.css";\ndeclare module "server-only";\n';

async function collectSources(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name))
    .map((e) => join(e.parentPath, e.name));
}

/**
 * Typecheck every .ts/.tsx file under a scaffolded app dir against the
 * monorepo's installed next/react and the built @voxx/core types.
 * Returns formatted diagnostics; an empty array means the scaffold is clean.
 */
export async function typecheckDir(appDir: string): Promise<string[]> {
  if (!(await exists(CORE_TYPES))) {
    throw new Error(
      `@voxx/core types not found at ${CORE_TYPES} — run "pnpm build --filter=voxx^..." first.`,
    );
  }
  if (!(await exists(WEB_NM))) {
    throw new Error(`${WEB_NM} not found — run "pnpm install" first.`);
  }

  const ambientFile = join(appDir, "globals.d.ts");
  await writeFile(ambientFile, AMBIENT);

  const program = ts.createProgram(
    await collectSources(appDir),
    compilerOptions(),
  );

  const host: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => appDir,
    getNewLine: () => "\n",
  };
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.formatDiagnostics([d], host).trim());
}
