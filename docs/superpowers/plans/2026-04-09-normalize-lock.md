# Normalize And Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `book-to-skill normalize` to rewrite local `skill.json` into a canonical form and `book-to-skill lock` to generate a minimal `skill.lock.json` release snapshot.

**Architecture:** Keep both commands local-directory only. `normalize` reads `skill.json`, applies conservative defaults plus deterministic field ordering, and writes the normalized manifest back to disk. `lock` validates the package and writes a `skill.lock.json` containing a small release snapshot of package identity and included files. Both commands reuse the existing validation helpers where possible.

**Tech Stack:** Node.js built-ins, `node:test`

---

### Task 1: Write failing normalize and lock tests

**Files:**
- Create: `/Users/dingliyang/test/skill-package-normalize-lock.test.js`

- [ ] **Step 1: Write a failing library test for normalizing a local manifest and adding safe defaults**
- [ ] **Step 2: Write a failing library test for generating `skill.lock.json`**
- [ ] **Step 3: Write a failing CLI test for `normalize`**
- [ ] **Step 4: Write a failing CLI test for `lock`**
- [ ] **Step 5: Run `node --test /Users/dingliyang/test/skill-package-normalize-lock.test.js` and verify it fails because normalize/lock are missing**

### Task 2: Implement normalize library

**Files:**
- Create: `/Users/dingliyang/src/manifest/normalize-skill-package.js`
- Create: `/Users/dingliyang/src/manifest/index.js`
- Modify: `/Users/dingliyang/src/install/package-validation.js`

- [ ] **Step 1: Read and validate local `skill.json` existence and JSON structure**
- [ ] **Step 2: Apply conservative defaults and canonical field ordering**
- [ ] **Step 3: Write normalized `skill.json` back to disk**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-normalize-lock.test.js` and verify normalize tests pass**

### Task 3: Implement lock library

**Files:**
- Modify: `/Users/dingliyang/src/manifest/index.js`
- Create: `/Users/dingliyang/src/manifest/write-skill-lock.js`

- [ ] **Step 1: Validate the local package directory before lock generation**
- [ ] **Step 2: Collect required file paths and optional README/adapters into a lock payload**
- [ ] **Step 3: Write `skill.lock.json` with deterministic JSON formatting**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-normalize-lock.test.js` and verify lock tests pass**

### Task 4: Add CLI support and docs

**Files:**
- Modify: `/Users/dingliyang/src/cli.js`
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Add `normalize <dir>` and `lock <dir>` command parsing**
- [ ] **Step 2: Print concise success messages for both commands**
- [ ] **Step 3: Add README examples for normalize and lock**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-normalize-lock.test.js` and verify CLI tests pass**

### Task 5: Verify regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/skill-package-normalize-lock.test.js /Users/dingliyang/test/skill-package-validate.test.js /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
