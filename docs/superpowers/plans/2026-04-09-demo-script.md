# Demo Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified demo script with `make`, `clean`, and `reset` subcommands for the example workflow.

**Architecture:** Create a single shell entrypoint at `scripts/demo.sh` and keep `make-example.sh` and `clean-example.sh` as thin compatibility wrappers. The unified script should default to `make`, accept an optional output directory, and expose `reset` as `clean` followed by `make`.

**Tech Stack:** POSIX shell, Node.js `node:test`

---

### Task 1: Add failing demo tests

**Files:**
- Modify: `/Users/dingliyang/test/make-example-script.test.js`

- [ ] **Step 1: Write a failing test for `demo.sh make <dir>`**
- [ ] **Step 2: Write a failing test for `demo.sh clean <dir>`**
- [ ] **Step 3: Write a failing test for `demo.sh reset <dir>`**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it fails because `demo.sh` is missing**

### Task 2: Implement the unified demo script

**Files:**
- Create: `/Users/dingliyang/scripts/demo.sh`
- Modify: `/Users/dingliyang/scripts/make-example.sh`
- Modify: `/Users/dingliyang/scripts/clean-example.sh`

- [ ] **Step 1: Parse subcommands and optional output directory**
- [ ] **Step 2: Implement `make`, `clean`, and `reset` behaviors**
- [ ] **Step 3: Convert old scripts into wrappers around `demo.sh`**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it passes**

### Task 3: Update npm scripts and docs

**Files:**
- Modify: `/Users/dingliyang/package.json`
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Point npm demo aliases at `demo.sh`**
- [ ] **Step 2: Document the new subcommand interface and keep wrapper examples minimal**
- [ ] **Step 3: Run the focused script test again and verify it stays green**

### Task 4: Run regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/make-example-script.test.js /Users/dingliyang/test/skill-spec-distill.test.js /Users/dingliyang/test/skill-package-from-spec.test.js /Users/dingliyang/test/skill-package-publish.test.js /Users/dingliyang/test/skill-package-normalize-lock.test.js /Users/dingliyang/test/skill-package-validate.test.js /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
