# Validate Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `book-to-skill validate` to check whether a skill package source is valid and report readable errors without installing it.

**Architecture:** Reuse the existing shared source-resolution flow for directory, git, and local archive inputs. The library returns a structured validation report with `valid`, `errors`, `warnings`, and an optional summary. The CLI supports a human-readable default report and a `--json` mode for automation.

**Tech Stack:** Node.js built-ins, system `git`, system `tar`, `node:test`

---

### Task 1: Write failing validate tests

**Files:**
- Create: `/Users/dingliyang/test/skill-package-validate.test.js`

- [ ] **Step 1: Write a failing library test for validating a local package directory**
- [ ] **Step 2: Write a failing library test for reporting errors on an invalid package directory**
- [ ] **Step 3: Write a failing CLI test for human-readable validate output**
- [ ] **Step 4: Write a failing CLI test for `validate --json` output**
- [ ] **Step 5: Run `node --test /Users/dingliyang/test/skill-package-validate.test.js` and verify it fails because validate is missing**

### Task 2: Implement validation library

**Files:**
- Create: `/Users/dingliyang/src/install/validate-skill-package.js`
- Modify: `/Users/dingliyang/src/install/index.js`

- [ ] **Step 1: Resolve package source without writing to the install store**
- [ ] **Step 2: Return `valid`, `errors`, `warnings`, and summary fields**
- [ ] **Step 3: Preserve archive-specific friendly errors**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-validate.test.js` and verify library tests pass**

### Task 3: Add CLI support and docs

**Files:**
- Modify: `/Users/dingliyang/src/cli.js`
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Add `validate <source>` parsing and `--json` flag**
- [ ] **Step 2: Print readable text output by default and JSON when requested**
- [ ] **Step 3: Set exit code `0` for valid and `1` for invalid**
- [ ] **Step 4: Add README examples for `validate`**
- [ ] **Step 5: Run `node --test /Users/dingliyang/test/skill-package-validate.test.js` and verify CLI tests pass**

### Task 4: Verify regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/skill-package-validate.test.js /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
