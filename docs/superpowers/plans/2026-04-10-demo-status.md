# Demo Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `status` subcommand to `scripts/demo.sh` so users can inspect the current example output directory without modifying it.

**Architecture:** Extend the existing unified shell entrypoint with a read-only `status` mode. The command should default to inspecting `./example-output`, accept an optional custom output directory, and print a small stable report showing directory presence, spec presence, generated skill presence, and archive count.

**Tech Stack:** POSIX shell, Node.js `node:test`

---

### Task 1: Add failing status tests

**Files:**
- Modify: `/Users/dingliyang/test/make-example-script.test.js`

- [ ] **Step 1: Write a failing test for `demo.sh status` on a missing directory**
- [ ] **Step 2: Write a failing test for `demo.sh status` after `make`**
- [ ] **Step 3: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it fails because `status` is not implemented**

### Task 2: Implement the status subcommand

**Files:**
- Modify: `/Users/dingliyang/scripts/demo.sh`

- [ ] **Step 1: Detect whether the output directory exists**
- [ ] **Step 2: Report `distilled_spec`, `skill_dir`, and `archive_count`**
- [ ] **Step 3: Add `status` to the usage output**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it passes**

### Task 3: Update npm scripts and docs

**Files:**
- Modify: `/Users/dingliyang/package.json`
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Add `npm run example:status`**
- [ ] **Step 2: Document default and custom `status` usage**
- [ ] **Step 3: Run the focused script test again and verify it stays green**

### Task 4: Run regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/make-example-script.test.js /Users/dingliyang/test/skill-spec-distill.test.js /Users/dingliyang/test/skill-package-from-spec.test.js /Users/dingliyang/test/skill-package-publish.test.js /Users/dingliyang/test/skill-package-normalize-lock.test.js /Users/dingliyang/test/skill-package-validate.test.js /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
