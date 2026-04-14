# Demo Output Dir Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit `--output-dir <dir>` support to `scripts/demo.sh` while preserving positional output directory compatibility.

**Architecture:** Extend the existing argument parser in `demo.sh` to recognize `--output-dir` for all subcommands. Positional directory arguments should continue to work, and `status --json --output-dir <dir>` should produce the same JSON shape as the existing positional form.

**Tech Stack:** POSIX shell, Node.js `node:test`

---

### Task 1: Add failing output-dir tests

**Files:**
- Modify: `/Users/dingliyang/test/make-example-script.test.js`

- [ ] **Step 1: Write a failing test for `demo.sh make --output-dir <dir>`**
- [ ] **Step 2: Write a failing test for `demo.sh status --json --output-dir <dir>`**
- [ ] **Step 3: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it fails because `--output-dir` is not implemented**

### Task 2: Implement output-dir parsing

**Files:**
- Modify: `/Users/dingliyang/scripts/demo.sh`

- [ ] **Step 1: Parse `--output-dir <dir>` for all subcommands**
- [ ] **Step 2: Preserve positional output directory compatibility**
- [ ] **Step 3: Update usage text**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it passes**

### Task 3: Update docs

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Document explicit `--output-dir` usage**
- [ ] **Step 2: Keep positional custom directory examples as a shorter alternative**
- [ ] **Step 3: Run focused tests again and verify they stay green**

### Task 4: Run regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/make-example-script.test.js /Users/dingliyang/test/skill-spec-distill.test.js /Users/dingliyang/test/skill-package-from-spec.test.js /Users/dingliyang/test/skill-package-publish.test.js /Users/dingliyang/test/skill-package-normalize-lock.test.js /Users/dingliyang/test/skill-package-validate.test.js /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
