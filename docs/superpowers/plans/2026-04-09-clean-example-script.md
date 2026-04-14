# Clean Example Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repo-local cleanup script that removes the generated example output directory used by the demo flow.

**Architecture:** Keep the implementation shell-based and aligned with the existing example script. The cleanup script should default to removing `./example-output`, accept an optional custom output directory, and be exposed through an npm alias so users can reset demo artifacts with one command.

**Tech Stack:** POSIX shell, Node.js `node:test`

---

### Task 1: Add failing cleanup test

**Files:**
- Modify: `/Users/dingliyang/test/make-example-script.test.js`

- [ ] **Step 1: Write a failing test that generates example output in a temp directory**
- [ ] **Step 2: Run the cleanup script against that temp directory and assert the directory is removed**
- [ ] **Step 3: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it fails because the cleanup script is missing**

### Task 2: Implement the cleanup script

**Files:**
- Create: `/Users/dingliyang/scripts/clean-example.sh`

- [ ] **Step 1: Accept an optional output root argument and default to `./example-output`**
- [ ] **Step 2: Remove the target directory if it exists**
- [ ] **Step 3: Print the cleaned path for easy confirmation**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/make-example-script.test.js` and verify it passes**

### Task 3: Wire docs and npm alias

**Files:**
- Modify: `/Users/dingliyang/package.json`
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Add `npm run example:clean` to invoke the cleanup script**
- [ ] **Step 2: Document default and custom cleanup usage**
- [ ] **Step 3: Run the focused script test again and verify it stays green**

### Task 4: Run regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/make-example-script.test.js /Users/dingliyang/test/skill-spec-distill.test.js /Users/dingliyang/test/skill-package-from-spec.test.js /Users/dingliyang/test/skill-package-publish.test.js /Users/dingliyang/test/skill-package-normalize-lock.test.js /Users/dingliyang/test/skill-package-validate.test.js /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
