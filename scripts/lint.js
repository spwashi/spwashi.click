#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const REQUIRED_HEADER_LINES = [
  'Intent:',
  'Invariants:',
  'How this composes with neighbors:'
];

async function walkFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(absolutePath);
    }

    return absolutePath;
  }));

  return files.flat();
}

function checkModuleHeader(filePath, fileContents) {
  if (!filePath.endsWith('.js')) {
    return [];
  }

  const missing = REQUIRED_HEADER_LINES.filter((line) => !fileContents.includes(line));
  if (missing.length === 0) {
    return [];
  }

  return [`Missing module header line(s): ${missing.join(', ')}`];
}

function checkNoDefaultExport(filePath, fileContents) {
  if (!filePath.endsWith('.js')) {
    return [];
  }

  if (/\bexport\s+default\b/.test(fileContents)) {
    return ['Default export detected; use named exports only'];
  }

  return [];
}

function pushCopyIssue(issues, copyPath, value, reason) {
  issues.push(`src/content/manifests.js:${copyPath}: ${reason} :: ${value}`);
}

function validateSpwCopyForms(issues, manifests, parser) {
  const { HOME_MANIFEST, WORK_MANIFEST, NOTES_MANIFEST } = manifests;
  const { clearSpwParserAdapter, isLikelySpwForm, parseSpwForm } = parser;
  clearSpwParserAdapter();

  const requiredCopyForms = [
    ['HOME_MANIFEST.slots.hero_tagline_slot', HOME_MANIFEST.slots.hero_tagline_slot],
    ['HOME_MANIFEST.slots.hero_subline_slot', HOME_MANIFEST.slots.hero_subline_slot],
    ['HOME_MANIFEST.slots.intro_body_slot', HOME_MANIFEST.slots.intro_body_slot],
    ['HOME_MANIFEST.slots.contact_cta_slot', HOME_MANIFEST.slots.contact_cta_slot],
    ...HOME_MANIFEST.selectedWork.flatMap((item, index) => [
      [`HOME_MANIFEST.selectedWork[${index}].title_slot`, item.title_slot],
      [`HOME_MANIFEST.selectedWork[${index}].summary_slot`, item.summary_slot]
    ]),
    ...HOME_MANIFEST.chapters.flatMap((chapter, index) => [
      [`HOME_MANIFEST.chapters[${index}].heading`, chapter.heading],
      [`HOME_MANIFEST.chapters[${index}].body`, chapter.body]
    ]),
    ['WORK_MANIFEST.slots.page_intro_slot', WORK_MANIFEST.slots.page_intro_slot],
    ...WORK_MANIFEST.projects.flatMap((project, index) => [
      [`WORK_MANIFEST.projects[${index}].title_slot`, project.title_slot],
      [`WORK_MANIFEST.projects[${index}].role_slot`, project.role_slot],
      [`WORK_MANIFEST.projects[${index}].summary_slot`, project.summary_slot],
      [`WORK_MANIFEST.projects[${index}].metrics_slot`, project.metrics_slot]
    ]),
    ['NOTES_MANIFEST.slots.page_intro_slot', NOTES_MANIFEST.slots.page_intro_slot],
    ...NOTES_MANIFEST.notes.flatMap((note, index) => [
      [`NOTES_MANIFEST.notes[${index}].title_slot`, note.title_slot],
      [`NOTES_MANIFEST.notes[${index}].excerpt_slot`, note.excerpt_slot]
    ])
  ];

  for (const [copyPath, value] of requiredCopyForms) {
    if (!isLikelySpwForm(value)) {
      pushCopyIssue(issues, copyPath, value, 'Copy string is not a spw form');
      continue;
    }

    const parseResult = parseSpwForm(value);
    if (!parseResult.ok) {
      pushCopyIssue(issues, copyPath, value, `Spw parse failed (${parseResult.reason ?? 'unknown'})`);
    }
  }
}

async function runLint() {
  const files = await walkFiles(SRC_DIR);
  const issues = [];
  const manifests = await import(path.join(ROOT_DIR, 'src/content/manifests.js'));
  const parser = await import(path.join(ROOT_DIR, 'src/core/spwlang-parser.js'));

  for (const filePath of files.sort()) {
    const contents = await readFile(filePath, 'utf8');
    const moduleHeaderIssues = checkModuleHeader(filePath, contents);
    const defaultExportIssues = checkNoDefaultExport(filePath, contents);

    for (const issue of [...moduleHeaderIssues, ...defaultExportIssues]) {
      issues.push(`${path.relative(ROOT_DIR, filePath)}: ${issue}`);
    }
  }

  validateSpwCopyForms(issues, manifests, parser);

  if (issues.length > 0) {
    console.error('Lint failed:\n');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Lint passed for ${files.length} source files.`);
}

runLint().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
