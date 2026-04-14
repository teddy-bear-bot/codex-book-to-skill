# Demo Status JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `--json` output mode to `scripts/demo.sh status` for machine-readable inspection.

**Architecture:** Extend the existing `status` subcommand without changing its text output by default. The command should accept `--json`, emit a stable JSON object containing `output_dir`, `directory`, `distilled_spec`, `skill_dir`, and `archive_count`, and keep existing shell-friendly text output unchanged when the flag is absent.

**Tech Stack:** POSIX shell, Node.js `node:test`

---

### Task 1: Add failing JSON status tests

**Files:**
- Modify: `/Users/dingliyang/test/make-example-script.test.js`

- [ ] **Step 1: Write a failing test for `demo.sh status --json` on a missing directory**
- [ ] **Step 2: Write a failing test for `demo.sh status --json` after `make`**
- [ ] **Step 3: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it fails because `--json` is not implemented**

### Task 2: Implement JSON status output

**Files:**
- Modify: `/Users/dingliyang/scripts/demo.sh`

- [ ] **Step 1: Parse `--json` for the `status` subcommand**
- [ ] **Step 2: Emit a stable JSON object with the existing status fields**
- [ ] **Step 3: Keep default text output unchanged**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it passes**

### Task 3: Update npm hints and docs

**Files:**
- Modify: `/Users/dingliyang/package.json`
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Add a convenient npm alias for JSON status output**
- [ ] **Step 2: Document `status --json` usage**
- [ ] **Step 3: Run the focused script test again and verify it stays green**

### Task 4: Run regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/make-example-script.test.js /Users/dingliyang/test/skill-spec-distill.test.js /Users/dingliyang/test/skill-package-from-spec.test.js /Users/dingliyang/test/skill-package-publish.test.js /Users/dingliyang/test/skill-package-normalize-lock.test.js /Users/dingliyang/test/skill-package-validate.test.js /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
