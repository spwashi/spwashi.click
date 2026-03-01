#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { cp, lstat, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const EXPORT_TARGETS = Object.freeze([
  'src',
  '.spw',
  'docs',
  'spw.index.json',
  'spw.index.spw',
  'assets.manifest.json',
  'manifest.webmanifest',
  'sw.js',
  'favicon.svg',
  'release.manifest.json',
  'seed/site',
  'seed/images'
]);

function parseArgs(argv) {
  const args = {
    target: '',
    mode: 'copy',
    clean: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--target' || token === '-t') {
      args.target = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (token === '--mode' || token === '-m') {
      args.mode = argv[index + 1] ?? 'copy';
      index += 1;
      continue;
    }

    if (token === '--clean') {
      args.clean = true;
    }
  }

  return args;
}

function normalizeMode(value) {
  return value === 'symlink' ? 'symlink' : 'copy';
}

async function ensureParentDirectory(targetPath) {
  await mkdir(path.dirname(targetPath), { recursive: true });
}

async function replicateTarget({ sourcePath, destinationPath, mode }) {
  await rm(destinationPath, { recursive: true, force: true });
  await ensureParentDirectory(destinationPath);

  if (mode === 'symlink') {
    const sourceStats = await lstat(sourcePath);
    const linkType = sourceStats.isDirectory() ? 'dir' : 'file';
    const relativeSource = path.relative(path.dirname(destinationPath), sourcePath);
    await symlink(relativeSource, destinationPath, linkType);
    return;
  }

  await cp(sourcePath, destinationPath, { recursive: true });
}

async function writeExportManifest({ targetDir, mode, copiedTargets }) {
  const payload = {
    schema: 'spw-export/v1',
    sourceRepo: 'spwashi.click',
    exportedAt: new Date().toISOString(),
    mode,
    targets: copiedTargets
  };

  const destinationPath = path.join(targetDir, 'spw-export.manifest.json');
  await writeFile(destinationPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = normalizeMode(args.mode);
  const targetDir = path.resolve(ROOT_DIR, args.target || '');

  if (!args.target) {
    throw new Error('Missing --target <directory>.');
  }

  if (args.clean) {
    await rm(targetDir, { recursive: true, force: true });
  }

  await mkdir(targetDir, { recursive: true });

  const copiedTargets = [];

  for (const target of EXPORT_TARGETS) {
    const sourcePath = path.join(ROOT_DIR, target);
    if (!existsSync(sourcePath)) {
      continue;
    }

    const destinationPath = path.join(targetDir, target);
    await replicateTarget({ sourcePath, destinationPath, mode });
    copiedTargets.push(target);
  }

  const packageJsonPath = path.join(ROOT_DIR, 'package.json');
  if (existsSync(packageJsonPath)) {
    const raw = await readFile(packageJsonPath, 'utf8');
    await writeFile(path.join(targetDir, 'package.json'), raw, 'utf8');
    copiedTargets.push('package.json');
  }

  await writeExportManifest({ targetDir, mode, copiedTargets });

  console.log(
    `Export complete: mode=${mode} target=${targetDir} copied=${copiedTargets.length}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
