# Inspect Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `book-to-skill inspect` so users can validate and preview a skill package from a local directory, git URL, or local `.tar.gz` without installing it.

**Architecture:** Reuse the existing source-resolution flow for directory, git, and archive inputs. `inspect` resolves the source into a temporary working directory when needed, validates `skill.json`, then returns a small manifest summary without touching the install store or registry. CLI output is pretty-printed JSON for easy reading and scripting.

**Tech Stack:** Node.js built-ins, system `git`, system `tar`, `node:test`

---

### Task 1: Write failing inspect tests

**Files:**
- Create: `/Users/dingliyang/test/skill-package-inspect.test.js`

- [ ] **Step 1: Write a failing library test for inspecting a local package directory**
- [ ] **Step 2: Write a failing library test for inspecting a local `.tar.gz` package**
- [ ] **Step 3: Write a failing library test for inspecting a git package at a specific ref**
- [ ] **Step 4: Write a failing CLI test for `book-to-skill inspect <source>`**
- [ ] **Step 5: Run `node --test /Users/dingliyang/test/skill-package-inspect.test.js` and verify it fails because inspect is missing**

### Task 2: Implement shared source inspection flow

**Files:**
- Create: `/Users/dingliyang/src/install/inspect-skill-package.js`
- Modify: `/Users/dingliyang/src/install/install-skill-package.js`
- Modify: `/Users/dingliyang/src/install/index.js`

- [ ] **Step 1: Extract or reuse source resolution for directory, git, and archive inputs**
- [ ] **Step 2: Validate the resolved package and build a manifest summary**
- [ ] **Step 3: Ensure temporary directories are cleaned up after inspect completes**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-inspect.test.js` and verify library tests pass**

### Task 3: Add CLI support

**Files:**
- Modify: `/Users/dingliyang/src/cli.js`
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Add `inspect <source>` argument parsing with existing `--subdir` and `--ref` flags**
- [ ] **Step 2: Print pretty JSON summary to stdout**
- [ ] **Step 3: Add README examples for `inspect`**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-package-inspect.test.js` and verify CLI tests pass**

### Task 4: Verify full regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
