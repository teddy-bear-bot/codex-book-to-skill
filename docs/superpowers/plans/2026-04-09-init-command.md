# Init Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `book-to-skill init` to scaffold a valid local skill package directory that can immediately be inspected, packed, and installed.

**Architecture:** Generate a minimal package skeleton from a built-in template, not by copying the example package. The command derives `id` from the target directory name, writes a complete valid `skill.json` plus required files, and keeps defaults simple so users can edit afterward. The generated package should pass the existing package validation flow unchanged.

**Tech Stack:** Node.js built-ins, `node:test`

---

### Task 1: Write failing init tests

**Files:**
- Create: `/Users/dingliyang/test/skill-package-init.test.js`

- [ ] **Step 1: Write a failing library test for generating a skeleton package directory**
- [ ] **Step 2: Write a failing CLI test for `book-to-skill init <dir>`**
- [ ] **Step 3: Write a failing test asserting the generated package can be inspected successfully**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-init.test.js` and verify it fails because init is missing**

### Task 2: Implement init library

**Files:**
- Create: `/Users/dingliyang/src/init/create-skill-package-skeleton.js`
- Create: `/Users/dingliyang/src/init/index.js`

- [ ] **Step 1: Derive package metadata from target directory name**
- [ ] **Step 2: Write required package files with minimal valid placeholder content**
- [ ] **Step 3: Prevent overwriting a non-empty target directory**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-init.test.js` and verify library tests pass**

### Task 3: Add CLI support and docs

**Files:**
- Modify: `/Users/dingliyang/src/cli.js`
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Add `init <dir>` parsing and command execution**
- [ ] **Step 2: Print a concise success message with target path**
- [ ] **Step 3: Add README examples for `init`**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-init.test.js` and verify CLI tests pass**

### Task 4: Verify regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
