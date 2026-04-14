# Publish Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `book-to-skill publish` to run the local release pipeline `normalize -> validate -> lock -> pack` and emit a distributable tarball.

**Architecture:** Keep `publish` local-directory only. The library orchestrates the existing normalize, validate, lock, and pack functions in sequence. On success it returns package identity plus lockfile and archive paths. By default it writes the tarball to `<dir>/dist/<id>-<version>.tar.gz`, with `--output` as an override.

**Tech Stack:** Node.js built-ins, system `tar`, `node:test`

---

### Task 1: Write failing publish tests

**Files:**
- Create: `/Users/dingliyang/test/skill-package-publish.test.js`

- [ ] **Step 1: Write a failing library test for publishing a valid local package directory**
- [ ] **Step 2: Write a failing library test for publishing to a custom output path**
- [ ] **Step 3: Write a failing CLI test for `publish <dir>`**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-publish.test.js` and verify it fails because publish is missing**

### Task 2: Implement publish library

**Files:**
- Create: `/Users/dingliyang/src/publish/publish-skill-package.js`
- Create: `/Users/dingliyang/src/publish/index.js`

- [ ] **Step 1: Normalize the local package manifest in place**
- [ ] **Step 2: Validate the normalized package and stop if invalid**
- [ ] **Step 3: Write `skill.lock.json`**
- [ ] **Step 4: Create the release tarball in `<dir>/dist/` by default or `--output` when provided**
- [ ] **Step 5: Run `node --test /Users/dingliyang/test/skill-package-publish.test.js` and verify library tests pass**

### Task 3: Add CLI support and docs

**Files:**
- Modify: `/Users/dingliyang/src/cli.js`
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Add `publish <dir> [--output <file>]` parsing**
- [ ] **Step 2: Print a concise success summary including lockfile and tarball path**
- [ ] **Step 3: Add README examples for publish**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-publish.test.js` and verify CLI tests pass**

### Task 4: Verify regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/skill-package-publish.test.js /Users/dingliyang/test/skill-package-normalize-lock.test.js /Users/dingliyang/test/skill-package-validate.test.js /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
