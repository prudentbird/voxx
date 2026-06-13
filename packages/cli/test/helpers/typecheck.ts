import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { exists } from "../../src/util";

const ROOT = join(import.meta.dirname, "../../../..");
const WEB_NM = join(ROOT, "apps/web/node_modules");
const CORE_TYPES = join(ROOT, "packages/core/dist/index.d.mts");

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

const AMBIENT = 'declare module "*.css";\ndeclare module "server-only";\n';

async function collectSources(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name))
    .map((e) => join(e.parentPath, e.name));
}

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
