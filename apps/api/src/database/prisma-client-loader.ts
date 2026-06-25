import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

function listGeneratedPrismaSources(sourceRoot: string) {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(file);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(file);
      }
    }
  };
  walk(sourceRoot);
  return files;
}

function patchGeneratedSource(source: string) {
  return source.replace('fileURLToPath(import.meta.url)', '__filename');
}

export function loadGeneratedPrismaClient() {
  const sourceRoot = resolve(process.cwd(), 'apps/api/generated/prisma');
  if (!existsSync(join(sourceRoot, 'client.ts'))) {
    throw new Error('Generated Prisma client source is missing.');
  }

  const sourceFiles = listGeneratedPrismaSources(sourceRoot);
  const signature = createHash('sha256')
    .update(sourceRoot)
    .update('\n')
    .update(
      sourceFiles
        .map((file) => {
          const stat = statSync(file);
          return `${relative(sourceRoot, file)}:${stat.size}:${Math.trunc(stat.mtimeMs)}`;
        })
        .join('\n'),
    )
    .digest('hex')
    .slice(0, 16);
  const outputRoot = resolve(process.cwd(), 'node_modules/.cache', `hanglian-prisma-client-cjs-${signature}`);
  const clientPath = join(outputRoot, 'client.js');

  if (!existsSync(clientPath)) {
    mkdirSync(outputRoot, { recursive: true });
    writeFileSync(join(outputRoot, 'package.json'), `${JSON.stringify({ type: 'commonjs' })}\n`);
    for (const file of sourceFiles) {
      const outputPath = join(outputRoot, relative(sourceRoot, file).replace(/\.ts$/, '.js'));
      mkdirSync(dirname(outputPath), { recursive: true });
      const result = ts.transpileModule(patchGeneratedSource(readFileSync(file, 'utf8')), {
        fileName: file,
        compilerOptions: {
          target: ts.ScriptTarget.ES2023,
          module: ts.ModuleKind.CommonJS,
          moduleResolution: ts.ModuleResolutionKind.NodeNext,
          esModuleInterop: true,
          sourceMap: false,
          inlineSources: false,
          isolatedModules: true,
        },
      });
      writeFileSync(outputPath, result.outputText);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(clientPath);
}
