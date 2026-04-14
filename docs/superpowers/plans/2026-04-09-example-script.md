# Example Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repo-local demo script that runs the example `distill -> from-spec -> publish` flow with one command.

**Architecture:** Keep the implementation shell-based and minimal. The script should accept an optional output directory, generate the distilled spec, generated skill directory, and packaged archive, then print the resulting paths so users can inspect the outputs immediately. Documentation and package scripts should point to the same entrypoint.

**Tech Stack:** POSIX shell, Node.js CLI, `node:test`

---

### Task 1: Add failing script test

**Files:**
- Create: `/Users/dingliyang/test/make-example-script.test.js`

- [ ] **Step 1: Write a failing test that runs the script against a temp output directory**
- [ ] **Step 2: Assert the script produces `distilled-spec.json`, `generated-skill/skill.json`, and a `.tar.gz` archive**
- [ ] **Step 3: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it fails because the script is missing**

### Task 2: Implement the demo script

**Files:**
- Create: `/Users/dingliyang/scripts/make-example.sh`

- [ ] **Step 1: Accept an optional output root argument and resolve defaults**
- [ ] **Step 2: Call `src/cli.js distill`, `from-spec`, and `publish` in sequence**
- [ ] **Step 3: Print the generated artifact paths for easy inspection**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it passes**

### Task 3: Wire docs and npm alias

**Files:**
- Modify: `/Users/dingliyang/package.json`
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Add `npm run example` to invoke the script**
- [ ] **Step 2: Document direct script usage and the generated output layout**
- [ ] **Step 3: Run the focused script test again and verify it stays green**

### Task 4: Run regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/make-example-script.test.js /Users/dingliyang/test/skill-spec-distill.test.js /Users/dingliyang/test/skill-package-from-spec.test.js /Users/dingliyang/test/skill-package-publish.test.js /Users/dingliyang/test/skill-package-normalize-lock.test.js /Users/dingliyang/test/skill-package-validate.test.js /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
