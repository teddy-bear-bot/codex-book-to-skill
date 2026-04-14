# EPUB Chapter Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add chapter-aware EPUB extraction that preserves outline metadata, improves generated `fragments`, and exposes a collapsible chapter tree in the local Web app.

**Architecture:** Extend the EPUB extraction path to produce structured `chapters` metadata in addition to plain text. Build the chapter tree from TOC/nav when available, fall back to heading-based segmentation when TOC is missing, then thread that metadata through distill input creation and the Web API/UI without breaking existing CLI or packaging flows.

**Tech Stack:** Node.js built-ins, local `zip`/`unzip` tools, existing `node:test` suite, vanilla HTML/CSS/JS frontend

---

## File Map

- Modify: `src/document-extract/extract-document-text.js`
  - Add EPUB TOC parsing, heading fallback, chapter-tree assembly, and improved `fragments` generation inputs.
- Modify: `src/document-extract/index.js`
  - Re-export any new extraction helpers or enriched return shapes if needed.
- Modify: `web/server.js`
  - Include chapter metadata in `/api/distill` document payload.
- Modify: `web/public/index.html`
  - Add a chapter outline panel container and summary placeholders.
- Modify: `web/public/app.js`
  - Render chapter tree, outline stats, and chapter previews from API responses.
- Modify: `web/public/styles.css`
  - Style collapsible chapter outline and preview blocks.
- Modify: `README.md`
  - Document chapter-aware EPUB behavior.
- Test: `test/document-extract.test.js`
  - Cover TOC parsing, heading fallback, alias title merge behavior.
- Test: `test/web-server.test.js`
  - Cover chapter metadata in `/api/distill` responses.

## Task 1: Build TOC-aware EPUB chapter extraction

**Files:**
- Modify: `src/document-extract/extract-document-text.js`
- Test: `test/document-extract.test.js`

- [ ] **Step 1: Write the failing TOC extraction test**

Add a test that builds a temporary EPUB with:
- `nav.xhtml` containing nested TOC links
- matching chapter XHTML files

Assert that:
- `extractDocumentText()` returns `sourceType === 'epub'`
- `result.chapters` exists
- `result.chapters.length > 0`
- first chapter keeps TOC title
- nested children are preserved

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test /Users/dingliyang/test/document-extract.test.js`

Expected:
- FAIL because `chapters` is missing or TOC structure is not parsed yet

- [ ] **Step 3: Write minimal TOC extraction implementation**

In `src/document-extract/extract-document-text.js`:
- Add helpers to list EPUB entries
- Detect and read `nav.xhtml` / `nav.html`
- Parse nested anchor structure into a chapter tree
- Resolve each chapter node to text from linked XHTML files
- Return `chapters` alongside `text`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test /Users/dingliyang/test/document-extract.test.js`

Expected:
- PASS for the new TOC-based EPUB test

- [ ] **Step 5: Record checkpoint**

If this workspace becomes a git repo later:

```bash
git add test/document-extract.test.js src/document-extract/extract-document-text.js
git commit -m "feat: parse epub toc into chapter tree"
```

Current note:
- Workspace is not a git repo, so no commit is possible now

## Task 2: Add heading fallback and alias title merge

**Files:**
- Modify: `src/document-extract/extract-document-text.js`
- Test: `test/document-extract.test.js`

- [ ] **Step 1: Write the failing fallback test**

Add a test EPUB with:
- no usable TOC
- `h1` / `h2` headings in XHTML

Assert that:
- `result.chapters` is built from headings
- hierarchy is preserved from heading levels

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test /Users/dingliyang/test/document-extract.test.js`

Expected:
- FAIL because heading-based chapter fallback is not implemented

- [ ] **Step 3: Write minimal fallback implementation**

In `src/document-extract/extract-document-text.js`:
- Parse heading tags from XHTML bodies
- Build chapter nodes when TOC is absent or incomplete
- Preserve as much nesting as available from heading levels

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test /Users/dingliyang/test/document-extract.test.js`

Expected:
- PASS for heading-fallback EPUB test

- [ ] **Step 5: Write the failing alias-title merge test**

Add a test EPUB where:
- TOC title is generic
- body heading is more specific

Assert that:
- chapter `title` keeps the TOC name
- `alias_titles` includes the more specific body heading

- [ ] **Step 6: Run test to verify it fails**

Run: `node --test /Users/dingliyang/test/document-extract.test.js`

Expected:
- FAIL because alias-title merging is not implemented

- [ ] **Step 7: Write minimal alias-title merge implementation**

In `src/document-extract/extract-document-text.js`:
- compare TOC titles and body headings
- preserve TOC as primary title
- append more specific heading text to `alias_titles`

- [ ] **Step 8: Run test to verify it passes**

Run: `node --test /Users/dingliyang/test/document-extract.test.js`

Expected:
- PASS for alias-title merge test

- [ ] **Step 9: Record checkpoint**

If git becomes available:

```bash
git add test/document-extract.test.js src/document-extract/extract-document-text.js
git commit -m "feat: add epub heading fallback and title aliases"
```

Current note:
- Workspace is not a git repo, so no commit is possible now

## Task 3: Improve distill inputs and API payloads

**Files:**
- Modify: `src/document-extract/extract-document-text.js`
- Modify: `src/document-extract/index.js`
- Modify: `web/server.js`
- Test: `test/document-extract.test.js`
- Test: `test/web-server.test.js`

- [ ] **Step 1: Write the failing distill-shape test**

Add assertions that chapter-aware EPUB extraction feeds:
- `createDistillInputFromDocumentText(...).chapters`
- chapter-derived `fragments`

Assert that:
- `fragments` titles align with chapter titles
- `chapters` metadata is preserved in distill input

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test /Users/dingliyang/test/document-extract.test.js`

Expected:
- FAIL because `chapters` is not included in distill input yet

- [ ] **Step 3: Write minimal distill-input implementation**

In `src/document-extract/extract-document-text.js` and `src/document-extract/index.js`:
- Add `chapters` to the returned document shape
- Update `createDistillInputFromDocumentText()` to keep `chapters`
- Generate better `fragments` from chapter nodes when available

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test /Users/dingliyang/test/document-extract.test.js`

Expected:
- PASS for the new distill-input shape test

- [ ] **Step 5: Write the failing API response test**

Update `test/web-server.test.js` so EPUB `/api/distill` assertions include:
- `payload.document.chapters`
- `payload.document.chapterCount`
- `payload.document.outlineDepth`

- [ ] **Step 6: Run test to verify it fails**

Run: `node --test /Users/dingliyang/test/web-server.test.js`

Expected:
- FAIL because the Web API does not return chapter metadata yet

- [ ] **Step 7: Write minimal API implementation**

In `web/server.js`:
- include `chapters`
- compute `chapterCount`
- compute `outlineDepth`

- [ ] **Step 8: Run test to verify it passes**

Run: `node --test /Users/dingliyang/test/web-server.test.js`

Expected:
- PASS for chapter metadata response assertions

- [ ] **Step 9: Record checkpoint**

If git becomes available:

```bash
git add test/document-extract.test.js test/web-server.test.js src/document-extract/extract-document-text.js src/document-extract/index.js web/server.js
git commit -m "feat: expose epub chapter metadata in distill api"
```

Current note:
- Workspace is not a git repo, so no commit is possible now

## Task 4: Render chapter tree in the Web UI

**Files:**
- Modify: `web/public/index.html`
- Modify: `web/public/app.js`
- Modify: `web/public/styles.css`
- Test: `test/web-server.test.js`

- [ ] **Step 1: Write the failing UI-shell test**

Extend the existing shell test to assert the page contains:
- chapter outline container
- chapter stats placeholders

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test /Users/dingliyang/test/web-server.test.js`

Expected:
- FAIL because the chapter outline UI is not in the HTML yet

- [ ] **Step 3: Write minimal UI shell implementation**

In `web/public/index.html`:
- add a “章节结构” panel or sub-panel
- add outline stats area
- add chapter tree container

In `web/public/styles.css`:
- add readable tree/list styles
- keep layout simple and consistent with existing page

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test /Users/dingliyang/test/web-server.test.js`

Expected:
- PASS for shell assertions

- [ ] **Step 5: Write the failing render test or API-driven assertion**

Because there is no browser test harness, add a narrow server/API-facing assertion plus a DOM-shell check:
- verify HTML contains chapter outline hooks
- verify API returns enough data for rendering

Expected:
- FAIL if hooks or payload fields are missing

- [ ] **Step 6: Write minimal rendering logic**

In `web/public/app.js`:
- render chapter count and outline depth
- recursively render chapter nodes
- show alias titles when present
- show truncated text preview on expand
- clear the panel for non-EPUB uploads or empty results

- [ ] **Step 7: Run test to verify it passes**

Run: `node --test /Users/dingliyang/test/web-server.test.js`

Expected:
- PASS for chapter panel shell and API-driven checks

- [ ] **Step 8: Record checkpoint**

If git becomes available:

```bash
git add web/public/index.html web/public/app.js web/public/styles.css test/web-server.test.js
git commit -m "feat: show epub chapter outline in web app"
```

Current note:
- Workspace is not a git repo, so no commit is possible now

## Task 5: Update docs and run regression

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the failing docs expectation**

Create a simple manual checklist:
- README mentions chapter-aware EPUB extraction
- README mentions outline preview in Web

- [ ] **Step 2: Update docs minimally**

In `README.md`:
- describe EPUB chapter-aware extraction
- mention Web chapter preview for EPUB uploads

- [ ] **Step 3: Run focused tests**

Run:

```bash
node --test /Users/dingliyang/test/document-extract.test.js /Users/dingliyang/test/web-server.test.js
```

Expected:
- PASS

- [ ] **Step 4: Run full regression**

Run:

```bash
node --test /Users/dingliyang/test/document-extract.test.js /Users/dingliyang/test/web-server.test.js /Users/dingliyang/test/make-example-script.test.js /Users/dingliyang/test/skill-spec-distill.test.js /Users/dingliyang/test/skill-package-from-spec.test.js /Users/dingliyang/test/skill-package-publish.test.js /Users/dingliyang/test/skill-package-normalize-lock.test.js /Users/dingliyang/test/skill-package-validate.test.js /Users/dingliyang/test/skill-package-init.test.js /Users/dingliyang/test/skill-package-inspect.test.js /Users/dingliyang/test/skill-package-pack.test.js /Users/dingliyang/test/skill-package-installer.test.js /Users/dingliyang/test/generic-markdown-exporter.test.js
```

Expected:
- PASS with no regressions

- [ ] **Step 5: Record final checkpoint**

If git becomes available:

```bash
git add README.md
git commit -m "docs: describe chapter-aware epub extraction"
```

Current note:
- Workspace is not a git repo, so no commit is possible now

## Execution Notes

- Follow TDD strictly for each sub-change
- Keep CLI and packaging behavior backward compatible
- Prefer small helpers inside `src/document-extract/extract-document-text.js` rather than a broad refactor
- Do not introduce new npm dependencies for this phase
