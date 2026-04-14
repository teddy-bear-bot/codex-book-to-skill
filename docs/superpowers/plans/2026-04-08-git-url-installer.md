# Git URL Installer Extension Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the local skill installer so `book-to-skill install <git-url>` works for git repositories that contain a skill package at their root.

**Architecture:** Reuse the existing copy-based installer. Detect git URLs, clone them into a temporary directory, then run the same manifest validation and install logic already used for local directory installs. Test with a local temporary git repository exposed via a `file://` URL.

**Tech Stack:** Node.js built-ins, `git` CLI, `node:test`

---

### Task 1: Write git URL failing tests

**Files:**
- Modify: `/Users/dingliyang/test/skill-package-installer.test.js`

- [ ] **Step 1: Add a helper that creates a temporary git repo containing `skill-package.example`**
- [ ] **Step 2: Add a failing test for `installSkillPackage(file://...)`**
- [ ] **Step 3: Add a failing CLI test for `book-to-skill install <file://repo>`**
- [ ] **Step 4: Run tests to verify they fail because git-url handling is missing**

### Task 2: Implement git URL support

**Files:**
- Modify: `/Users/dingliyang/src/install/install-skill-package.js`

- [ ] **Step 1: Detect git-style sources (`file://`, `http://`, `https://`, `git@`)**
- [ ] **Step 2: Clone the repo to a temporary directory using `git clone`**
- [ ] **Step 3: Reuse existing install flow against the cloned directory**
- [ ] **Step 4: Preserve original source reference in registry metadata**

### Task 3: Verify end-to-end

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run installer tests**
- [ ] **Step 2: Run full test suite**
- [ ] **Step 3: Add README example for `install <git-url>`**
