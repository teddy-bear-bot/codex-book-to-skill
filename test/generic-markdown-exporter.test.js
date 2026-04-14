const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

async function readRootFile(filename) {
  return fs.readFile(path.join(rootDir, filename), 'utf8');
}

test('exportGenericMarkdown returns a markdown artifact wrapper', async () => {
  const spec = JSON.parse(await readRootFile('skill-spec.example.json'));
  const { exportGenericMarkdown } = require('../src/adapters/generic-markdown');

  const result = exportGenericMarkdown(spec);

  assert.equal(result.adapter, 'generic-markdown');
  assert.equal(result.status, 'ok');
  assert.equal(result.artifacts[0].media_type, 'text/markdown');
});

test('exportGenericMarkdown renders the expected markdown sections', async () => {
  const spec = JSON.parse(await readRootFile('skill-spec.example.json'));
  const { exportGenericMarkdown } = require('../src/adapters/generic-markdown');

  const result = exportGenericMarkdown(spec);
  const markdown = result.artifacts[0].content;

  assert.match(markdown, /^# 金字塔结构写作 Skill/m);
  assert.match(markdown, /## 核心原则/);
  assert.match(markdown, /## 工作流/);
  assert.match(markdown, /## 评估清单/);
});

test('exportGenericMarkdown reports warnings and losses for markdown export', async () => {
  const spec = JSON.parse(await readRootFile('skill-spec.example.json'));
  const { exportGenericMarkdown } = require('../src/adapters/generic-markdown');

  const result = exportGenericMarkdown(spec);

  assert.equal(result.warnings[0].code, 'metadata-partial-render');
  assert.equal(result.losses[0].field, 'platform_adapters');
});

test('exportGenericMarkdown aligns with the checked-in reference fixtures', async () => {
  const spec = JSON.parse(await readRootFile('skill-spec.example.json'));
  const expectedMarkdown = await readRootFile('generic-markdown.example.md');
  const expectedResult = JSON.parse(
    await readRootFile('export-generic-markdown-result.example.json')
  );
  const { exportGenericMarkdown } = require('../src/adapters/generic-markdown');

  const actual = exportGenericMarkdown(spec);

  assert.equal(actual.artifacts[0].content, expectedMarkdown);
  assert.deepEqual(actual.warnings, expectedResult.warnings);
  assert.deepEqual(actual.losses, expectedResult.losses);
});
