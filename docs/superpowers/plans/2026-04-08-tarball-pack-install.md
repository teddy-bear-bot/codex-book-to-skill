# Tarball Pack And Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pack` to create a distributable `.tar.gz` skill package and allow `install` to consume local `.tar.gz` archives directly.

**Architecture:** Keep the archive format simple: the tarball root must be a valid skill package root containing `skill.json`. `pack` validates an existing package directory and uses system `tar` to create the archive. `install` detects local `.tar.gz` inputs, extracts them to a temporary directory, validates the unpacked package, and then reuses the current install flow.

**Tech Stack:** Node.js built-ins, system `tar`, `node:test`

---

### Task 1: Add failing tests for tarball packaging

**Files:**
- Create: `/Users/dingliyang/test/skill-package-pack.test.js`
- Modify: `/Users/dingliyang/test/skill-package-installer.test.js`

- [ ] **Step 1: Write a failing unit test for creating a `.tar.gz` archive from `skill-package.example`**
- [ ] **Step 2: Run `node --test /Users/dingliyang/test/skill-package-pack.test.js` and verify it fails because `pack` does not exist yet**
- [ ] **Step 3: Write a failing install test for `installSkillPackage('./skill.tar.gz')`**
- [ ] **Step 4: Write a failing CLI test for `book-to-skill install ./skill.tar.gz`**
- [ ] **Step 5: Run `node --test /Users/dingliyang/test/skill-package-installer.test.js` and verify the new archive tests fail for missing archive support**

### Task 2: Implement archive creation

**Files:**
- Create: `/Users/dingliyang/src/pack/create-skill-package-archive.js`
- Create: `/Users/dingliyang/src/pack/index.js`
- Modify: `/Users/dingliyang/src/cli.js`

- [ ] **Step 1: Implement archive output naming and validation against `skill.json`**
- [ ] **Step 2: Invoke system `tar` to create a `.tar.gz` with package files at archive root**
- [ ] **Step 3: Add CLI `pack <package-dir> [--output <file>]` support**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-pack.test.js` and verify it passes**

### Task 3: Implement archive installation

**Files:**
- Modify: `/Users/dingliyang/src/install/install-skill-package.js`
- Modify: `/Users/dingliyang/src/install/index.js`
- Modify: `/Users/dingliyang/src/cli.js`

- [ ] **Step 1: Detect local `.tar.gz` or `.tgz` sources before directory validation**
- [ ] **Step 2: Extract archive to a temporary directory using system `tar`**
- [ ] **Step 3: Reuse existing manifest validation and install flow from extracted directory**
- [ ] **Step 4: Clean up temporary extraction directories with `finally`**
- [ ] **Step 5: Run `node --test /Users/dingliyang/test/skill-package-installer.test.js` and verify archive tests pass**

### Task 4: Document and verify end-to-end

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Add README examples for `pack` and `install ./skill.tar.gz`**
- [ ] **Step 2: Run `node --test /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 3: Verify the suite reports 0 failures**
