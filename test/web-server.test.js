const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');

const rootDir = path.resolve(__dirname, '..');
const execFileAsync = promisify(execFile);
const commandAvailability = new Map();

async function hasCommand(command, versionArg = '-v') {
  const cacheKey = `${command}:${versionArg}`;
  if (!commandAvailability.has(cacheKey)) {
    commandAvailability.set(
      cacheKey,
      execFileAsync(command, [versionArg])
        .then(() => true)
        .catch(() => false)
    );
  }
  return commandAvailability.get(cacheKey);
}

async function withServer(callback, options = {}) {
  const { createWebServer } = require('../web/server');
  const outputRoot = options.outputRoot || (await fs.mkdtemp(path.join(os.tmpdir(), 'bts-web-output-')));
  const server = createWebServer({ rootDir, outputRoot });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    return await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function postJson(baseUrl, endpoint, body) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  return { response, payload };
}

async function createEpubBuffer() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-web-epub-'));
  const epubPath = path.join(tempDir, 'habits.epub');
  await fs.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'OEBPS'), { recursive: true });
  await fs.writeFile(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf8');
  await fs.writeFile(
    path.join(tempDir, 'META-INF', 'container.xml'),
    '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapter.xhtml'),
    '<html><body><h1>Habit Design</h1><p>Make cues obvious and actions easy.</p></body></html>',
    'utf8'
  );
  await execFileAsync('zip', ['-X', '-q', '-r', epubPath, 'mimetype', 'META-INF', 'OEBPS'], {
    cwd: tempDir,
  });
  return fs.readFile(epubPath);
}

test('web server returns the checked-in distill example', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/example`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.book_title, 'Atomic Habits');
    assert.equal(Array.isArray(payload.fragments), true);
  });
});

test('web server serves the local web app shell', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Book-to-Skill Web/i);
    assert.match(html, /distill-form/i);
    assert.match(html, /chapter-outline-panel/i);
    assert.match(html, /chapter-stats/i);
    assert.match(html, /chapter-tree/i);
    assert.match(html, /id="chapter-count"/i);
    assert.match(html, /id="chapter-depth"/i);
    assert.match(html, /id="chapter-count">-</i);
    assert.match(html, /id="chapter-depth">-</i);
    assert.match(html, /id="skill-name-input"/i);
    assert.match(html, /id="package-version-input"[^>]*value="0\.0\.1"/i);
    assert.doesNotMatch(html, /id="title-input"/i);
    assert.doesNotMatch(html, /id="topic-input"/i);
    assert.doesNotMatch(html, /id="load-example"/i);
    assert.doesNotMatch(html, /加载示例 JSON/i);
    assert.match(html, /id="status-box"[^>]*aria-live="polite"/i);
    assert.match(html, /id="warnings-box"[^>]*aria-live="polite"/i);
  });
});

test('web server distills uploaded document text into a skill spec', async () => {
  await withServer(async (baseUrl) => {
    const content = Buffer.from('# Habit Design\n\nMake good habits obvious and easy.').toString(
      'base64'
    );
    const { response, payload } = await postJson(baseUrl, '/api/distill', {
      fileName: 'habit-notes.md',
      contentBase64: content,
    });

    assert.equal(response.status, 200);
    assert.equal(payload.spec.version, '1.0.0');
    assert.match(payload.spec.title, /habit-notes|Habit/i);
    assert.equal(payload.document.sourceType, 'md');
    assert.equal(payload.document.chapterCount, 0);
    assert.equal(payload.document.outlineDepth, 0);
    assert.deepEqual(payload.document.chapters, []);
  });
});

test('web server distills uploaded epub documents into a skill spec', async (t) => {
  if (!(await hasCommand('zip'))) {
    t.skip('zip command not available in this environment');
  }

  await withServer(async (baseUrl) => {
    const content = (await createEpubBuffer()).toString('base64');
    const { response, payload } = await postJson(baseUrl, '/api/distill', {
      fileName: 'habits.epub',
      contentBase64: content,
    });

    assert.equal(response.status, 200);
    assert.equal(payload.spec.version, '1.0.0');
    assert.equal(payload.document.sourceType, 'epub');
    assert.equal(Array.isArray(payload.document.chapters), true);
    assert.equal(payload.document.chapters.length > 0, true);
    assert.equal(payload.document.chapterCount, payload.document.chapters.length);
    assert.equal(payload.document.outlineDepth, 1);
    assert.equal(typeof payload.document.chapters[0].text, 'string');
    assert.match(payload.spec.title, /habits|Habit/i);
  });
});

test('web server creates missing outputRoot before handling distill uploads', async () => {
  const outputRoot = path.join(
    os.tmpdir(),
    `bts-web-missing-output-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    'nested-root'
  );

  await withServer(
    async (baseUrl) => {
      const content = Buffer.from('# Habit Design\n\nMake good habits obvious and easy.').toString(
        'base64'
      );
      const { response, payload } = await postJson(baseUrl, '/api/distill', {
        fileName: 'habit-notes.md',
        contentBase64: content,
      });

      assert.equal(response.status, 200);
      assert.equal(payload.document.sourceType, 'md');
    },
    { outputRoot }
  );
});

test('web server returns 400 for uploads that extract no readable text', async () => {
  await withServer(async (baseUrl) => {
    const content = Buffer.from('   \n\n  ').toString('base64');
    const { response, payload } = await postJson(baseUrl, '/api/distill', {
      fileName: 'empty.txt',
      contentBase64: content,
    });

    assert.equal(response.status, 400);
    assert.match(payload.error, /No readable text extracted/);
  });
});

test('web server packages a generated spec and exposes a downloadable archive', async () => {
  await withServer(async (baseUrl) => {
    const example = await fetch(`${baseUrl}/api/example`).then((response) => response.json());
    const distillResult = await postJson(baseUrl, '/api/distill', {
      distillInput: example,
    });
    const { response, payload } = await postJson(baseUrl, '/api/package', {
      spec: distillResult.payload.spec,
    });

    assert.equal(response.status, 200);
    assert.equal(payload.manifest.id.length > 0, true);
    assert.match(payload.archive.downloadUrl, /^\/downloads\//);

    const archiveResponse = await fetch(`${baseUrl}${payload.archive.downloadUrl}`);
    const archiveBuffer = Buffer.from(await archiveResponse.arrayBuffer());

    assert.equal(archiveResponse.status, 200);
    assert.equal(archiveBuffer.length > 0, true);
  });
});

test('web server applies pre-distill skill name and package version to packaged skill', async () => {
  await withServer(async (baseUrl) => {
    const example = await fetch(`${baseUrl}/api/example`).then((response) => response.json());
    const distillResult = await postJson(baseUrl, '/api/distill', {
      distillInput: example,
      skillName: 'jrx-default',
      packageVersion: '0.2.3',
    });
    const packageResult = await postJson(baseUrl, '/api/package', {
      spec: distillResult.payload.spec,
    });

    assert.equal(distillResult.response.status, 200);
    assert.equal(distillResult.payload.spec.id, 'jrx-default');
    assert.equal(distillResult.payload.spec.package_version, '0.2.3');
    assert.equal(packageResult.response.status, 200);
    assert.equal(packageResult.payload.manifest.id, 'jrx-default');
    assert.equal(packageResult.payload.manifest.version, '0.2.3');
  });
});

test('web server rejects invalid pre-distill package version', async () => {
  await withServer(async (baseUrl) => {
    const example = await fetch(`${baseUrl}/api/example`).then((response) => response.json());
    const { response, payload } = await postJson(baseUrl, '/api/distill', {
      distillInput: example,
      packageVersion: 'v1',
    });

    assert.equal(response.status, 400);
    assert.match(payload.error, /package version/i);
  });
});

test('web server rejects unsupported uploaded document formats with a clear 400 error', async () => {
  await withServer(async (baseUrl) => {
    const content = Buffer.from('mobi body').toString('base64');
    const { response, payload } = await postJson(baseUrl, '/api/distill', {
      fileName: 'book.mobi',
      contentBase64: content,
    });

    assert.equal(response.status, 400);
    assert.match(payload.error, /Unsupported document format/i);
    assert.match(payload.error, /\.pdf/);
    assert.match(payload.error, /\.docx/);
    assert.match(payload.error, /\.epub/);
    assert.match(payload.error, /\.txt/);
  });
});
