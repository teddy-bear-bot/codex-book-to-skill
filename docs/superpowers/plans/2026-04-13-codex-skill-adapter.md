# Codex Skill Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert a selected installed book-to-skill package into a Codex-native Skill under `~/.codex/skills/<skill-id>` and launch `codex` from `book-to-skill chat` so Codex handles the real skill interaction.

**Architecture:** Keep the existing `chat` host as the selector and handoff layer, but replace the placeholder runtime with a Codex adapter flow. Add one module to sync installed Skills into Codex's on-disk Skill format, one module to launch Codex safely, and wire `/skill` selection to trigger sync + handoff instead of placeholder response rendering.

**Tech Stack:** Node.js built-ins, existing install/registry/chat modules, `node:test`, filesystem copy/write helpers, child-process spawning, no new npm dependencies

---

## File Map

- Modify: `src/chat/run-chat-host.js`
  - Replace post-selection placeholder runtime with Codex sync + launch handoff.
- Create: `src/chat/codex-skill-adapter.js`
  - Generate Codex-native Skill directories from installed Skills.
- Create: `src/chat/launch-codex.js`
  - Launch `codex`, detect missing command, and surface fallback messaging.
- Modify: `src/chat/skill-runtime.js`
  - Remove placeholder-only assumptions and keep only metadata helpers still needed by `/inputs`.
- Test: `test/chat-host.test.js`
  - Add handoff behavior coverage for `/skill` selection, missing `codex`, missing source files, and spawn failures.
- Create: `test/codex-skill-adapter.test.js`
  - Cover Codex Skill generation, overwrite safety, provenance metadata, and missing-entrypoint errors.
- Create: `test/helpers/skill-test-helpers.js`
  - Shared test fixtures for example archives and installed example Skills.
- Modify: `README.md`
  - Document Codex adapter flow in the Chinese project README.
- Modify: `README-user-guide.md`
  - Document how `book-to-skill chat` installs to Codex and what users do after Codex opens.

## Task 1: Add failing tests for Codex Skill generation

**Files:**
- Create: `test/codex-skill-adapter.test.js`
- Create: `test/helpers/skill-test-helpers.js`
- Create: `src/chat/codex-skill-adapter.js`

- [ ] **Step 1: Add shared test helpers for example package setup**

Create `test/helpers/skill-test-helpers.js` with small reusable helpers:

- `createExampleArchive()`
- `installExampleSkill({ storeRoot, version })`
- `createInstalledSkillMissingEntrypointFixture({ file: 'system.md' | 'inputs.schema.json' })`
- `createFakeCodexCommand()`

`createInstalledSkillMissingEntrypointFixture(...)` should return:

```js
{
  installedSkill,
  storeRoot,
}
```

This avoids copying ad-hoc setup into each test file and makes the TDD steps executable.

- [ ] **Step 2: Write a failing test for generating a Codex Skill directory from an installed Skill**

```js
test('syncInstalledSkillToCodex writes SKILL.md, references, and provenance', async () => {
  const codexRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-codex-root-'));
  const { installExampleSkill } = require('./helpers/skill-test-helpers');
  const installedSkill = await installExampleSkill();
  const { syncInstalledSkillToCodex } = require('../src/chat/codex-skill-adapter');

  const result = await syncInstalledSkillToCodex(installedSkill, { codexSkillsRoot: codexRoot });

  const skillMd = await fs.readFile(path.join(result.codexSkillPath, 'SKILL.md'), 'utf8');
  const systemCopy = await fs.readFile(
    path.join(result.codexSkillPath, 'references', 'system.md'),
    'utf8'
  );
  const provenance = JSON.parse(
    await fs.readFile(
      path.join(result.codexSkillPath, 'references', 'book-to-skill.json'),
      'utf8'
    )
  );

  assert.match(skillMd, /^---[\s\S]*name: pyramid-writing-skill/m);
  assert.match(skillMd, /references\/system\.md/);
  assert.match(systemCopy, /你是一个结构化写作助手/);
  assert.equal(provenance.generated_by, 'book-to-skill');
});
```

- [ ] **Step 3: Write a failing test for refusing to overwrite non-book-to-skill content**

```js
test('syncInstalledSkillToCodex refuses to overwrite non-book-to-skill content', async () => {
  const codexRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-codex-root-'));
  const targetDir = path.join(codexRoot, 'pyramid-writing-skill');
  const { installExampleSkill } = require('./helpers/skill-test-helpers');
  const installedSkill = await installExampleSkill();
  const { syncInstalledSkillToCodex } = require('../src/chat/codex-skill-adapter');
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, 'SKILL.md'), 'manual skill\n', 'utf8');

  await assert.rejects(
    () => syncInstalledSkillToCodex(installedSkill, { codexSkillsRoot: codexRoot }),
    /refusing to overwrite/i
  );
});
```

- [ ] **Step 4: Write a failing test for overwriting an existing book-to-skill-generated Codex Skill**

```js
test('syncInstalledSkillToCodex overwrites an existing generated Codex skill', async () => {
  const codexRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-codex-root-'));
  const { installExampleSkill } = require('./helpers/skill-test-helpers');
  const installedSkill = await installExampleSkill();
  const { syncInstalledSkillToCodex } = require('../src/chat/codex-skill-adapter');

  await syncInstalledSkillToCodex(installedSkill, { codexSkillsRoot: codexRoot });
  await fs.writeFile(
    path.join(codexRoot, 'pyramid-writing-skill', 'SKILL.md'),
    'stale generated content\n',
    'utf8'
  );

  const result = await syncInstalledSkillToCodex(installedSkill, { codexSkillsRoot: codexRoot });
  const skillMd = await fs.readFile(path.join(result.codexSkillPath, 'SKILL.md'), 'utf8');

  assert.doesNotMatch(skillMd, /stale generated content/);
});
```

- [ ] **Step 5: Write a failing test for missing package entrypoint files**

```js
test('syncInstalledSkillToCodex fails clearly when configured system prompt file is missing', async () => {
  const codexRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-codex-root-'));
  const { createInstalledSkillMissingEntrypointFixture } = require('./helpers/skill-test-helpers');
  const { installedSkill } = await createInstalledSkillMissingEntrypointFixture({
    file: 'system.md',
  });
  const { syncInstalledSkillToCodex } = require('../src/chat/codex-skill-adapter');

  await assert.rejects(
    () => syncInstalledSkillToCodex(installedSkill, { codexSkillsRoot: codexRoot }),
    /missing configured skill file/i
  );
});
```

- [ ] **Step 6: Write a failing test for missing inputs schema file**

```js
test('syncInstalledSkillToCodex fails clearly when configured inputs schema file is missing', async () => {
  const codexRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-codex-root-'));
  const { createInstalledSkillMissingEntrypointFixture } = require('./helpers/skill-test-helpers');
  const { installedSkill } = await createInstalledSkillMissingEntrypointFixture({
    file: 'inputs.schema.json',
  });
  const { syncInstalledSkillToCodex } = require('../src/chat/codex-skill-adapter');

  await assert.rejects(
    () => syncInstalledSkillToCodex(installedSkill, { codexSkillsRoot: codexRoot }),
    /missing configured skill file/i
  );
});
```

- [ ] **Step 7: Run the focused test and verify it fails**

Run:

```bash
node --test test/codex-skill-adapter.test.js
```

Expected:
- FAIL because the Codex adapter does not exist yet

## Task 2: Implement Codex Skill generation and overwrite policy

**Files:**
- Create: `src/chat/codex-skill-adapter.js`
- Create: `test/helpers/skill-test-helpers.js`
- Test: `test/codex-skill-adapter.test.js`

- [ ] **Step 1: Implement root resolution and target path selection**

In `src/chat/codex-skill-adapter.js`, add helpers for:

- resolving `~/.codex/skills` by default
- building `<codexSkillsRoot>/<skill-id>`
- reading the installed package manifest from `installedPath/skill.json`

- [ ] **Step 2: Implement generated `SKILL.md` rendering**

Render a concise Codex-native skill entrypoint with:

- YAML frontmatter `name` and `description`
- instructions to read `references/system.md`
- instructions to read `references/inputs.schema.json` when needed
- a short note to avoid reproducing copyrighted source text

- [ ] **Step 3: Implement references copying and provenance metadata**

Copy from the installed package:

- configured `entrypoints.system_prompt_file` → `references/system.md`
- configured `entrypoints.inputs_schema_file` → `references/inputs.schema.json`

Write `references/book-to-skill.json` with:

```json
{
  "generated_by": "book-to-skill",
  "generated_at": "...",
  "source_skill": {
    "id": "...",
    "name": "...",
    "version": "...",
    "installed_path": "..."
  }
}
```

- [ ] **Step 4: Implement overwrite safety**

Behavior:

- if target directory does not exist: create it
- if target directory exists and has `references/book-to-skill.json` with `generated_by = book-to-skill`: replace it
- if target directory exists without that marker: throw a clear error

- [ ] **Step 5: Implement missing-entrypoint validation**

Before copying:

- read the installed manifest
- resolve `entrypoints.system_prompt_file`
- resolve `entrypoints.inputs_schema_file`
- if either file is missing, throw a clear `missing configured skill file` style error

- [ ] **Step 7: Run the focused test and verify it passes**

Run:

```bash
node --test test/codex-skill-adapter.test.js
```

Expected:
- PASS for generation and overwrite-safety tests

## Task 3: Add failing chat-host tests for Codex handoff

**Files:**
- Modify: `test/chat-host.test.js`
- Create: `test/helpers/skill-test-helpers.js`
- Modify: `src/chat/run-chat-host.js`
- Create: `src/chat/launch-codex.js`

- [ ] **Step 1: Write a failing test for `/skill` selection syncing to Codex and falling back when `codex` is unavailable**

```js
test('selecting a skill installs a Codex skill and prints manual fallback when codex is unavailable', async () => {
  const { createExampleArchive } = require('./helpers/skill-test-helpers');
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-store-'));
  const codexRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-codex-root-'));

  const result = await runNode(
    ['src/cli.js', 'chat', archivePath, '--store', storeDir],
    {
      env: {
        ...process.env,
        BTS_CHAT_SCRIPT: '/skill\n1\n',
        BTS_CODEX_SKILLS_ROOT: codexRoot,
        BTS_CODEX_BIN: path.join(rootDir, 'test', 'fixtures', 'missing-codex'),
      },
    }
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed Codex skill:/i);
  assert.match(result.stdout, /Open Codex manually/i);
});
```

- [ ] **Step 2: Write a failing test for successful Codex launch handoff**

Use `createFakeCodexCommand()` from `test/helpers/skill-test-helpers.js`.
That helper should:

- create a temp file such as `/tmp/fake-codex-xxxx.js`
- add a shebang `#!/usr/bin/env node`
- print `fake codex started`
- `chmod 755` the file
- return `{ binPath }`

```js
test('selecting a skill launches codex when codex is available', async () => {
  const {
    createExampleArchive,
    createFakeCodexCommand,
  } = require('./helpers/skill-test-helpers');
  const fakeCodex = await createFakeCodexCommand();
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-store-'));
  const codexRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-codex-root-'));
  const result = await runNode(
    ['src/cli.js', 'chat', archivePath, '--store', storeDir],
    {
      env: {
        ...process.env,
        BTS_CHAT_SCRIPT: '/skill\n1\n',
        BTS_CODEX_SKILLS_ROOT: codexRoot,
        BTS_CODEX_BIN: fakeCodex.binPath,
      },
    }
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Launching Codex/i);
  assert.match(result.stdout, /fake codex started/i);
});
```

- [ ] **Step 3: Write a failing test for sync failure when source skill files are missing**

```js
test('selection reports sync errors and keeps the host alive when skill files are missing', async () => {
  const { createInstalledSkillMissingEntrypointFixture } = require('./helpers/skill-test-helpers');
  const brokenSkill = await createInstalledSkillMissingEntrypointFixture({
    file: 'inputs.schema.json',
  });
  const codexRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-codex-root-'));

  const result = await runNode(['src/cli.js', 'chat', '--store', brokenSkill.storeRoot], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\n1\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexRoot,
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Failed to install Codex skill/i);
  assert.match(result.stdout, /Exiting chat host\./);
});
```

- [ ] **Step 4: Write a failing test for unexpected spawn failure**

```js
test('selection reports codex launch errors clearly when spawn fails unexpectedly', async () => {
  const { createExampleArchive } = require('./helpers/skill-test-helpers');
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-store-'));
  const codexRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-codex-root-'));

  const result = await runNode(
    ['src/cli.js', 'chat', archivePath, '--store', storeDir],
    {
      env: {
        ...process.env,
        BTS_CHAT_SCRIPT: '/skill\n1\n/exit\n',
        BTS_CODEX_SKILLS_ROOT: codexRoot,
        BTS_CODEX_BIN: '/',
      },
    }
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Failed to launch Codex/i);
  assert.match(result.stdout, /Exiting chat host\./);
});
```

- [ ] **Step 5: Run the focused test and verify it fails**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- FAIL because `/skill` selection still only sets active skill state

## Task 4: Implement Codex launch and chat handoff behavior

**Files:**
- Create: `src/chat/launch-codex.js`
- Modify: `src/chat/run-chat-host.js`
- Modify: `src/chat/skill-runtime.js`
- Test: `test/chat-host.test.js`

- [ ] **Step 1: Implement a small Codex launcher wrapper**

In `src/chat/launch-codex.js`, add a helper like:

```js
async function launchCodex(options = {}) {
  // resolve command from options.codexBin, env BTS_CODEX_BIN, or 'codex'
  // spawn with stdio: 'inherit' in real terminal mode
  // in scripted/test mode, allow piping stdout/stderr back for assertions
}
```

Return a structured result such as:

```js
{ ok: true, command: 'codex', exitCode: 0 }
```

or:

```js
{ ok: false, reason: 'missing_command', command: 'codex' }
```

Also surface a separate structured result for unexpected spawn failures, for example:

```js
{ ok: false, reason: 'spawn_failed', command: 'codex', message: '...' }
```

- [ ] **Step 2: Replace placeholder runtime after skill selection**

In `src/chat/run-chat-host.js`:

- keep `/inputs`, `/info`, `/help`, `/exit`, `/quit`
- when a pending `/skill` selection resolves successfully:
  - mark active skill
  - call `syncInstalledSkillToCodex()`
  - print `Installed Codex skill: ...`
  - call `launchCodex()`
  - on missing command, print manual fallback message
  - on sync failure, print a clear error and keep the host alive
  - on unexpected spawn failure, print a clear error and keep the host alive
  - after handoff, exit the host loop for v1 instead of staying in placeholder runtime mode

- [ ] **Step 3: Remove placeholder free-text runtime path for active skills**

Change post-selection behavior so that normal free text is no longer routed to:

```js
runPlaceholderRuntime(activeSkill, line)
```

Instead, v1 hands off to Codex immediately on selection. Any remaining runtime helper file should only keep shared metadata-loading helpers used by `/inputs`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
node --test test/chat-host.test.js test/codex-skill-adapter.test.js
```

Expected:
- PASS for Codex handoff and generation behavior

## Task 5: Sync documentation and run full regression

**Files:**
- Modify: `README.md`
- Modify: `README-user-guide.md`
- Test: all existing test files

- [ ] **Step 1: Update `README.md` with Codex adapter behavior**

Document:

- generated Codex Skill install path `~/.codex/skills/<skill-id>`
- `book-to-skill chat` now installs the Skill into Codex after selection
- if Codex exists, `book-to-skill` launches it
- if Codex is missing, user can open Codex manually and ask for the skill by name

- [ ] **Step 2: Update `README-user-guide.md` with user-facing Codex flow**

Include an example such as:

```text
book-to-skill chat ./pyramid-writing-skill.tar.gz
/skill
1
# Codex opens
Help me use pyramid-writing-skill to draft an outline for ...
```

- [ ] **Step 3: Run the full test suite**

Run:

```bash
node --test
```

Expected:
- PASS with 0 failures

- [ ] **Step 4: Record any remaining non-blocking follow-ups in the final handoff**

Mention only if still true after implementation:

- future support for explicit Codex launch flags
- future Claude Code / Gemini adapters
- possible max-download-size hardening for remote archives
