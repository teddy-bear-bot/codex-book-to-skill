# Chat Host Step Tips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show step-by-step English `Tip:` guidance in the terminal host so external users always see the next command to type.

**Architecture:** Keep the existing host status box unchanged and add a small formatter for contextual tip lines. Print the first tip after the welcome screen and print the selection tip after `/skill` lists installed skills, matching the current host state transitions.

**Tech Stack:** Node.js, existing chat host formatter/output helpers, `node:test`

---

### Task 1: Add failing host-tip tests

**Files:**
- Modify: `test/chat-host.test.js`
- Test: `test/chat-host.test.js`

- [ ] **Step 1: Write the failing tests**

```js
test('host welcome shows /skill tip after startup', async () => {
  const result = await runNode(['src/cli.js', 'chat'], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/exit\n' },
  });

  assert.match(result.stdout, /Tip:\s+Type '\/skill' to choose an installed skill/i);
});

test('/skill shows exact-selection tip after listing skills', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-tip-select-'));
  const result = await runNode(['src/cli.js', 'chat', archivePath, '--store', storeDir], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/skill\n/exit\n' },
  });

  assert.match(result.stdout, /Tip:\s+Type the exact skill id or id@version/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/chat-host.test.js`
Expected: FAIL because the tip lines are not printed yet.

- [ ] **Step 3: Write minimal implementation**

```js
function formatHostTip(message, useAnsi) {
  return `Tip: ${message}`;
}
```

Add the startup tip after the welcome screen and the selection tip after `/skill` renders the installed skill list.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/chat-host.test.js`
Expected: PASS

### Task 2: Keep formatting localized to the host formatter

**Files:**
- Modify: `src/chat/format-host-screen.js`
- Modify: `src/chat/run-chat-host.js`
- Test: `test/chat-host.test.js`

- [ ] **Step 1: Add a shared tip formatter**

Create a formatter in `src/chat/format-host-screen.js` so all tips keep the same `Tip:` prefix and ANSI styling rules.

- [ ] **Step 2: Wire tip output to host states**

Print:
- startup: `Tip: Type '/skill' to choose an installed skill`
- pending selection: `Tip: Type the exact skill id or id@version`

- [ ] **Step 3: Re-run focused tests**

Run: `node --test test/chat-host.test.js`
Expected: PASS with the new tips present.

- [ ] **Step 4: Run full verification**

Run: `npm test`
Expected: PASS
