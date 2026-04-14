# Chat Host Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `book-to-skill chat` host shell that can install local or remote `.tar.gz` packages, enter a persistent host session, let the user choose installed Skills with `/skill`, and switch into a persistent Skill session.

**Architecture:** Extend the CLI with a new `chat` entrypoint, but keep the interactive shell logic outside `src/cli.js`. Reuse the existing installer and registry flows for package installation and Skill discovery, add a small session state layer for host-vs-skill mode, and implement a conservative terminal-native shell loop with ANSI-styled welcome output.

**Tech Stack:** Node.js built-ins, existing install/registry modules, `node:test`, ANSI terminal output, no new npm dependencies

---

## File Map

- Modify: `src/cli.js`
  - Add `chat` argument parsing and dispatch.
- Modify: `src/install/source-resolution.js`
  - Add remote `.tar.gz` download support for direct URL installs.
- Modify: `src/install/index.js`
  - Export any newly needed helpers for chat flows.
- Create: `src/chat/index.js`
  - Public chat-host entrypoint.
- Create: `src/chat/run-chat-host.js`
  - Main host bootstrap and REPL loop.
- Create: `src/chat/session-state.js`
  - Session state for host mode, active Skill, and reset behavior.
- Create: `src/chat/format-host-screen.js`
  - ANSI welcome screen and shell output helpers.
- Create: `src/chat/select-skill.js`
  - `/skill` listing and selection flow.
- Create: `src/chat/skill-runtime.js`
  - Load installed Skill metadata and basic invocation bridge.
- Test: `test/chat-host.test.js`
  - Add coverage for CLI entry, install-before-host, host commands, `/skill`, and Skill session flow.
- Modify: `README.md`
  - Add `chat` quick-start usage.
- Modify: `README-user-guide.md`
  - Sync user-facing host workflow with the new command.

## Task 1: Add failing tests for the `chat` command entrypoint

**Files:**
- Create: `test/chat-host.test.js`
- Modify: `src/cli.js`

- [ ] **Step 1: Write a failing CLI test for `book-to-skill chat` with no arguments**

```js
test('CLI chat command enters host mode with no active skill', async () => {
  const result = await runNode(['src/cli.js', 'chat'], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /BOOK-TO-SKILL/i);
  assert.match(result.stdout, /NO SKILL SELECTED/i);
});
```

- [ ] **Step 2: Write a failing CLI test for `book-to-skill chat <local-tarball>`**

```js
test('CLI chat installs a local tarball before entering host mode', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-store-'));
  const result = await runNode(['src/cli.js', 'chat', archivePath, '--store', storeDir], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed pyramid-writing-skill@1.0.0/i);
  assert.match(result.stdout, /NO SKILL SELECTED/i);
});
```

- [ ] **Step 3: Write a failing CLI test for `book-to-skill chat <remote-url>`**

```js
test('CLI chat downloads and installs a remote tarball before entering host mode', async () => {
  const server = await createArchiveServer();
  const result = await runNode(['src/cli.js', 'chat', server.url], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed .*@1.0.0/i);
});
```

- [ ] **Step 4: Run the focused test and verify it fails**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- FAIL because `chat` is not implemented

## Task 2: Add `chat` CLI parsing and host bootstrap

**Files:**
- Modify: `src/cli.js`
- Create: `src/chat/index.js`
- Create: `src/chat/run-chat-host.js`

- [ ] **Step 1: Add `chat` to CLI parsing**

In `src/cli.js`, add a new branch:

```js
if (command === 'chat') {
  const source = rest[0];
  const globalInstall = rest.includes('--global');
  return { command, source, storeRoot, globalInstall };
}
```

- [ ] **Step 2: Add a small `src/chat/index.js` export**

```js
const { runChatHost } = require('./run-chat-host');

module.exports = {
  runChatHost,
};
```

- [ ] **Step 3: Dispatch `chat` in `src/cli.js`**

```js
if (args.command === 'chat') {
  await runChatHost({
    source: args.source,
    storeRoot: args.storeRoot,
    globalInstall: args.globalInstall,
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  });
  return;
}
```

- [ ] **Step 4: Implement the minimal host bootstrap**

In `src/chat/run-chat-host.js`, start with:

```js
async function runChatHost(options = {}) {
  options.stdout.write('>_ BOOK-TO-SKILL (host v0.1)\n');
  options.stdout.write('NO SKILL SELECTED\n');
}
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- PASS for the no-argument host bootstrap test

## Task 3: Reuse install flow for local and remote package entry

**Files:**
- Modify: `src/install/source-resolution.js`
- Create: `src/chat/run-chat-host.js`
- Test: `test/chat-host.test.js`

- [ ] **Step 1: Write a failing test for direct HTTP `.tar.gz` resolution**

```js
test('chat accepts a remote tarball URL', async () => {
  const server = await createArchiveServer();
  const result = await runNode(['src/cli.js', 'chat', server.url], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/exit\n' },
  });

  assert.equal(result.code, 0);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- FAIL because remote archives are not downloaded yet

- [ ] **Step 3: Add remote archive download support in `src/install/source-resolution.js`**

Implement a helper that:

- detects `http://` or `https://` archive URLs ending in `.tar.gz` / `.tgz`
- downloads to a temp file with built-in `http` / `https`
- reuses archive extraction

Minimal shape:

```js
async function downloadArchiveSource(sourceUrl) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-download-'));
  const archivePath = path.join(tempRoot, 'package.tar.gz');
  await downloadUrlToFile(sourceUrl, archivePath);
  return extractArchiveSource(archivePath);
}
```

- [ ] **Step 4: Install source before host entry in `runChatHost()`**

If `source` exists and is not already an installed Skill ID:

- call `installSkillPackage(source, installOptions)`
- print a short success line
- then continue into the host shell

- [ ] **Step 5: Run the focused test and verify it passes**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- PASS for local and remote install-before-host cases

## Task 4: Implement host shell state and command loop

**Files:**
- Create: `src/chat/session-state.js`
- Create: `src/chat/format-host-screen.js`
- Modify: `src/chat/run-chat-host.js`
- Test: `test/chat-host.test.js`

- [ ] **Step 1: Write a failing host-command test for `/help`, `/info`, and `/exit`**

```js
test('host commands work before a skill is selected', async () => {
  const result = await runNode(['src/cli.js', 'chat'], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/help\n/info\n/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /\/skill/);
  assert.match(result.stdout, /NO SKILL SELECTED/);
});
```

- [ ] **Step 2: Write a failing test for free text before skill selection**

```js
test('host reminds the user to select a skill when no skill is active', async () => {
  const result = await runNode(['src/cli.js', 'chat'], {
    env: { ...process.env, BTS_CHAT_SCRIPT: 'hello\n/exit\n' },
  });

  assert.match(result.stdout, /Use \/skill to choose one/i);
});
```

- [ ] **Step 3: Run the focused test and verify it fails**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- FAIL because the host loop is not interactive yet

- [ ] **Step 4: Add a minimal session-state module**

```js
function createSessionState() {
  return {
    activeSkill: null,
    history: [],
  };
}
```

- [ ] **Step 5: Add a minimal host REPL loop**

In `run-chat-host.js`, read newline-delimited input from either:

- `options.script` / `process.env.BTS_CHAT_SCRIPT` in tests
- `stdin` in normal use

Handle:

- `/help`
- `/info`
- `/exit`
- `/quit`
- plain text with no active Skill

- [ ] **Step 6: Add ANSI welcome-screen formatting helper**

Create `src/chat/format-host-screen.js` with a small function like:

```js
function formatHostScreen() {
  return [
    '\x1b[38;5;180m╔════ ✦ BOOK-TO-SKILL HOST ✦ ════╗\x1b[0m',
    'MODE   : HOST',
    'STATUS : NO SKILL SELECTED',
    '/skill choose skill',
  ].join('\n');
}
```

- [ ] **Step 7: Run the focused test and verify it passes**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- PASS for host shell command behavior

## Task 5: Implement `/skill` selection against the installed registry

**Files:**
- Create: `src/chat/select-skill.js`
- Modify: `src/chat/run-chat-host.js`
- Test: `test/chat-host.test.js`

- [ ] **Step 1: Write a failing test for `/skill` with installed Skills**

```js
test('host lists installed skills and allows selecting by number', async () => {
  const storeDir = await installExampleSkill();
  const result = await runNode(['src/cli.js', 'chat', '--store', storeDir], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/skill\n1\n/info\n/exit\n' },
  });

  assert.match(result.stdout, /1\. pyramid-writing-skill@1.0.0/);
  assert.match(result.stdout, /Active skill: pyramid-writing-skill@1.0.0/);
});
```

- [ ] **Step 2: Write a failing test for selection by Skill ID**

```js
test('host allows selecting a skill by id', async () => {
  const storeDir = await installExampleSkill();
  const result = await runNode(['src/cli.js', 'chat', '--store', storeDir], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill\n/info\n/exit\n' },
  });

  assert.match(result.stdout, /Active skill: pyramid-writing-skill@1.0.0/);
});
```

- [ ] **Step 3: Run the focused test and verify it fails**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- FAIL because `/skill` listing and selection are not implemented

- [ ] **Step 4: Implement `select-skill.js`**

Use `listInstalledSkills()` and render:

```js
1. pyramid-writing-skill@1.0.0
2. other-skill@0.3.0
```

Accept:

- number selection
- exact ID selection

- [ ] **Step 5: Update the host loop to enter selection mode after `/skill`**

Minimal behavior:

- print list
- read the next input line as selection
- set `state.activeSkill`
- print activation message

- [ ] **Step 6: Run the focused test and verify it passes**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- PASS for `/skill` selection by number and by ID

## Task 6: Implement basic Skill session mode

**Files:**
- Create: `src/chat/skill-runtime.js`
- Modify: `src/chat/session-state.js`
- Modify: `src/chat/run-chat-host.js`
- Test: `test/chat-host.test.js`

- [ ] **Step 1: Write a failing test for `/inputs`, `/reset`, and `/skill` inside a Skill session**

```js
test('skill session commands work after selecting a skill', async () => {
  const storeDir = await installExampleSkill();
  const result = await runNode(['src/cli.js', 'chat', '--store', storeDir], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\n1\n/inputs\n/reset\n/info\n/skill\n1\n/exit\n',
    },
  });

  assert.match(result.stdout, /goal/);
  assert.match(result.stdout, /Session reset/i);
});
```

- [ ] **Step 2: Write a failing test for plain text routed to the active Skill**

```js
test('plain text is routed to the active skill session', async () => {
  const storeDir = await installExampleSkill();
  const result = await runNode(['src/cli.js', 'chat', '--store', storeDir], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/skill\n1\nhello there\n/exit\n' },
  });

  assert.match(result.stdout, /pyramid-writing-skill/i);
  assert.match(result.stdout, /hello there/i);
});
```

- [ ] **Step 3: Run the focused test and verify it fails**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- FAIL because active Skill session behavior is not implemented

- [ ] **Step 4: Implement minimal installed Skill loading**

In `src/chat/skill-runtime.js`:

- load installed Skill directory from registry entry
- read `skill.json`
- read `system.md`
- read `inputs.schema.json` if present

Minimal shape:

```js
async function loadInstalledSkill(entry) {
  const manifest = JSON.parse(await fs.readFile(path.join(entry.installedPath, 'skill.json'), 'utf8'));
  const system = await fs.readFile(path.join(entry.installedPath, 'system.md'), 'utf8');
  return { entry, manifest, system };
}
```

- [ ] **Step 5: Implement minimal session command handling**

When active Skill is set:

- `/inputs` prints schema summary
- `/info` prints active Skill identity
- `/reset` clears session history
- `/skill` returns to host selection mode
- plain text appends to history and echoes a minimal placeholder runtime result

- [ ] **Step 6: Run the focused test and verify it passes**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- PASS for basic Skill session flow

## Task 7: Update docs and run full verification

**Files:**
- Modify: `README.md`
- Modify: `README-user-guide.md`

- [ ] **Step 1: Write the failing docs expectation**

Manual checklist:

- README mentions `book-to-skill chat`
- README explains `/skill`
- user guide reflects install-then-host behavior

- [ ] **Step 2: Update docs minimally**

In `README.md`, add:

```md
## Chat Host

```bash
book-to-skill chat
book-to-skill chat ./my-skill.tar.gz
```
```

In `README-user-guide.md`, align wording with actual command behavior.

- [ ] **Step 3: Run the focused tests**

Run:

```bash
node --test test/chat-host.test.js
```

Expected:
- PASS

- [ ] **Step 4: Run full regression**

Run:

```bash
node --test
```

Expected:
- PASS with 0 failures

- [ ] **Step 5: Record final checkpoint**

If this becomes a git repo later:

```bash
git add src/cli.js src/chat test/chat-host.test.js README.md README-user-guide.md
git commit -m "feat: add chat host shell"
```

Current note:
- Workspace is not a git repo, so no commit is possible now
