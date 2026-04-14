# Generic Markdown Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal, dependency-light `generic-markdown` export adapter that converts a valid Skill Spec JSON object into a Markdown artifact plus export result metadata.

**Architecture:** Use plain Node.js with built-in modules only. Keep the adapter isolated under `src/adapters/generic-markdown`, expose one `exportGenericMarkdown` entrypoint, and verify behavior with `node:test` against the existing `skill-spec.example.json`, `generic-markdown.example.md`, and `export-generic-markdown-result.example.json` reference files.

**Tech Stack:** Node.js, built-in `node:test`, built-in `assert`, CommonJS modules, JSON fixtures

---

### Task 1: Create Minimal Runtime Scaffold

**Files:**
- Create: `/Users/dingliyang/package.json`
- Create: `/Users/dingliyang/src/adapters/generic-markdown/index.js`
- Create: `/Users/dingliyang/src/adapters/generic-markdown/exporter.js`
- Test: `/Users/dingliyang/test/generic-markdown-exporter.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('exportGenericMarkdown returns a markdown artifact wrapper', async () => {
  const spec = JSON.parse(await readFile('skill-spec.example.json', 'utf8'));
  const { exportGenericMarkdown } = require('../src/adapters/generic-markdown');

  const result = exportGenericMarkdown(spec);

  assert.equal(result.adapter, 'generic-markdown');
  assert.equal(result.status, 'ok');
  assert.equal(result.artifacts[0].media_type, 'text/markdown');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test /Users/dingliyang/test/generic-markdown-exporter.test.js`
Expected: FAIL because the adapter module does not exist yet

- [ ] **Step 3: Write minimal implementation**

```js
function exportGenericMarkdown() {
  return {
    adapter: 'generic-markdown',
    status: 'ok',
    artifacts: [{ path: '', media_type: 'text/markdown', encoding: 'utf-8', content: '' }],
    warnings: [],
    losses: [],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test /Users/dingliyang/test/generic-markdown-exporter.test.js`
Expected: PASS

- [ ] **Step 5: Skip commit**

Reason: `/Users/dingliyang` is not a git repository, so commit steps are intentionally skipped in this workspace.

### Task 2: Generate Stable Markdown Content

**Files:**
- Modify: `/Users/dingliyang/src/adapters/generic-markdown/exporter.js`
- Test: `/Users/dingliyang/test/generic-markdown-exporter.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('exportGenericMarkdown renders the expected markdown sections', async () => {
  const spec = JSON.parse(await readFile('skill-spec.example.json', 'utf8'));
  const { exportGenericMarkdown } = require('../src/adapters/generic-markdown');

  const result = exportGenericMarkdown(spec);
  const markdown = result.artifacts[0].content;

  assert.match(markdown, /^# 金字塔结构写作 Skill/m);
  assert.match(markdown, /## 核心原则/);
  assert.match(markdown, /## 工作流/);
  assert.match(markdown, /## 评估清单/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test /Users/dingliyang/test/generic-markdown-exporter.test.js`
Expected: FAIL because the placeholder exporter returns empty markdown

- [ ] **Step 3: Write minimal implementation**

Implement a deterministic renderer that maps:
- identity fields into overview
- source fields into source section
- lists into bullet sections
- `core_principles`, `workflow`, `decision_rules`, `constraints`, `anti_patterns`, `output_format`, `example_tasks`, and `evaluation_checklist` into readable Markdown sections

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test /Users/dingliyang/test/generic-markdown-exporter.test.js`
Expected: PASS

- [ ] **Step 5: Skip commit**

Reason: workspace is not a git repository.

### Task 3: Add Export Result Metadata

**Files:**
- Modify: `/Users/dingliyang/src/adapters/generic-markdown/exporter.js`
- Test: `/Users/dingliyang/test/generic-markdown-exporter.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('exportGenericMarkdown reports warnings and losses for markdown export', async () => {
  const spec = JSON.parse(await readFile('skill-spec.example.json', 'utf8'));
  const { exportGenericMarkdown } = require('../src/adapters/generic-markdown');

  const result = exportGenericMarkdown(spec);

  assert.equal(result.warnings[0].code, 'metadata-partial-render');
  assert.equal(result.losses[0].field, 'platform_adapters');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test /Users/dingliyang/test/generic-markdown-exporter.test.js`
Expected: FAIL because warnings and losses are not yet populated

- [ ] **Step 3: Write minimal implementation**

Populate:
- `warnings` with at least one markdown-specific metadata rendering warning
- `losses` for fields intentionally reduced or omitted in the human-readable export

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test /Users/dingliyang/test/generic-markdown-exporter.test.js`
Expected: PASS

- [ ] **Step 5: Skip commit**

Reason: workspace is not a git repository.

### Task 4: Verify Against Reference Fixtures

**Files:**
- Modify: `/Users/dingliyang/test/generic-markdown-exporter.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('exportGenericMarkdown aligns with the checked-in reference fixtures', async () => {
  const spec = JSON.parse(await readFile('skill-spec.example.json', 'utf8'));
  const expectedMarkdown = await readFile('generic-markdown.example.md', 'utf8');
  const expectedResult = JSON.parse(await readFile('export-generic-markdown-result.example.json', 'utf8'));
  const { exportGenericMarkdown } = require('../src/adapters/generic-markdown');

  const actual = exportGenericMarkdown(spec);

  assert.equal(actual.artifacts[0].content, expectedMarkdown);
  assert.deepEqual(actual.warnings, expectedResult.warnings);
  assert.deepEqual(actual.losses, expectedResult.losses);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test /Users/dingliyang/test/generic-markdown-exporter.test.js`
Expected: FAIL until renderer output matches the checked-in fixtures exactly

- [ ] **Step 3: Write minimal implementation**

Refine rendering and metadata output until the adapter result matches the reference fixtures exactly enough for stable regression coverage.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test /Users/dingliyang/test/generic-markdown-exporter.test.js`
Expected: PASS

- [ ] **Step 5: Run the full verification**

Run: `node --test /Users/dingliyang/test/generic-markdown-exporter.test.js`
Expected: All tests PASS with no runtime errors

- [ ] **Step 6: Skip commit**

Reason: workspace is not a git repository.
