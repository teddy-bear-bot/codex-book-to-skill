# Distill Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `book-to-skill distill` to convert structured fragment input into a first-draft `Skill Spec` JSON file.

**Architecture:** Keep the first version deterministic and local-only. The distiller reads a structured JSON input containing book metadata, scenarios, optional input definitions, and `summary`/`excerpt` fragments. It applies simple mapping and aggregation rules to generate a valid `Skill Spec` draft that can immediately feed the existing `from-spec` and publish pipeline. It also returns warnings for fallback behavior such as missing explicit input types.

**Tech Stack:** Node.js built-ins, `node:test`

---

### Task 1: Write failing distill tests

**Files:**
- Create: `/Users/dingliyang/test/skill-spec-distill.test.js`

- [ ] **Step 1: Write a failing library test for generating a spec from structured fragment input**
- [ ] **Step 2: Write a failing library test for warning when fragment inputs need fallback behavior**
- [ ] **Step 3: Write a failing CLI test for `distill <input.json> --output <spec.json>`**
- [ ] **Step 4: Write a failing test showing the output can be consumed by `from-spec`**
- [ ] **Step 5: Run `node --test /Users/dingliyang/test/skill-spec-distill.test.js` and verify it fails because distill is missing**

### Task 2: Implement distill library

**Files:**
- Create: `/Users/dingliyang/src/distill/create-skill-spec-from-fragments.js`
- Create: `/Users/dingliyang/src/distill/index.js`

- [ ] **Step 1: Read and minimally validate the structured distillation input JSON**
- [ ] **Step 2: Derive title, summary, goal, scenarios, and inputs from the input payload**
- [ ] **Step 3: Generate core principles, workflow, constraints, output format, and evaluation checklist via deterministic rules**
- [ ] **Step 4: Return warnings for fallback behaviors such as missing input types or inferred IDs**
- [ ] **Step 5: Run `node --test /Users/dingliyang/test/skill-spec-distill.test.js` and verify library tests pass**

### Task 3: Add CLI support and docs

**Files:**
- Modify: `/Users/dingliyang/src/cli.js`
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Add `distill <input.json> --output <spec.json>` parsing**
- [ ] **Step 2: Write the generated spec file and print warnings when present**
- [ ] **Step 3: Add README examples for distill and the follow-up from-spec flow**
- [ ] **Step 4: Run `node --test /Users/dingliyang/test/skill-spec-distill.test.js` and verify CLI tests pass**

### Task 4: Verify regression suite

**Files:**
- Modify: `/Users/dingliyang/README.md`

- [ ] **Step 1: Run `node --test /Users/dingliyang/test/skill-spec-distill.test.js /Users/dingliyang/test/skill-package-from-spec.test.js /Users/dingliyang/test/skill-package-publish.test.js /Users/dingliyang/test/skill-package-normalize-lock.test.js /Users/dingliyang/test/skill-package-validate.test.js /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js`**
- [ ] **Step 2: Verify the suite reports 0 failures**
