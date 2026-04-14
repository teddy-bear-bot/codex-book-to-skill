# Skill Package Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal local installer prototype for `Skill Package` directories so a user can run `book-to-skill install <path>` and get a copied, registered local skill.

**Architecture:** Use plain Node.js built-ins only. Split responsibilities into a small installer library, a CLI entrypoint, and `node:test` coverage. Keep validation manual and minimal: required manifest fields plus required file existence.

**Tech Stack:** Node.js, CommonJS, built-in `node:test`, built-in `fs`, built-in `path`, built-in `os`

---

### Task 1: Add failing tests for installer behavior

**Files:**
- Create: `/Users/dingliyang/test/skill-package-installer.test.js`
- Test: `/Users/dingliyang/test/skill-package-installer.test.js`

- [ ] **Step 1: Write the failing tests**

Cover:
- successful install from `skill-package.example`
- registry creation with default adapter
- failure when `skill.json` is missing

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test /Users/dingliyang/test/skill-package-installer.test.js`
Expected: FAIL because installer modules do not exist yet

- [ ] **Step 3: Skip commit**

Reason: workspace is not a git repository.

### Task 2: Implement installer library

**Files:**
- Create: `/Users/dingliyang/src/install/index.js`
- Create: `/Users/dingliyang/src/install/install-skill-package.js`
- Modify: `/Users/dingliyang/package.json`

- [ ] **Step 1: Write minimal implementation**

Implement:
- `installSkillPackage(sourcePath, options)`
- required manifest field checks
- required file existence checks
- recursive copy to target store
- registry file update

- [ ] **Step 2: Run tests**

Run: `node --test /Users/dingliyang/test/skill-package-installer.test.js`
Expected: some tests still fail until CLI exists

- [ ] **Step 3: Skip commit**

Reason: workspace is not a git repository.

### Task 3: Implement CLI

**Files:**
- Create: `/Users/dingliyang/src/cli.js`
- Modify: `/Users/dingliyang/package.json`

- [ ] **Step 1: Write minimal CLI**

Support:
- `book-to-skill install <path>`
- optional `--store <path>`

- [ ] **Step 2: Run tests**

Run: `node --test /Users/dingliyang/test/skill-package-installer.test.js`
Expected: PASS

- [ ] **Step 3: Run full verification**

Run: `node --test /Users/dingliyang/test/generic-markdown-exporter.test.js /Users/dingliyang/test/skill-package-installer.test.js`
Expected: All tests PASS

- [ ] **Step 4: Skip commit**

Reason: workspace is not a git repository.
