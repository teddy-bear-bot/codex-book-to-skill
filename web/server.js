const http = require('node:http');
const fs = require('node:fs/promises');
const fss = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { URL } = require('node:url');

const { createDistillInputFromDocumentText, extractDocumentText } = require('../src/document-extract');
const { createSkillSpecFromFragments } = require('../src/distill');
const { createSkillPackageFromSpec } = require('../src/from-spec');
const { publishSkillPackage } = require('../src/publish');

const DEFAULT_PORT = Number(process.env.PORT || 8787);
const DEFAULT_PACKAGE_VERSION = '0.0.1';
const PACKAGE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.tar.gz': 'application/gzip',
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, {
    error: message,
  });
}

async function readJsonRequest(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw);
}

function safeFileName(fileName) {
  return path.basename(String(fileName || 'uploaded.txt')).replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function toKebabCase(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function createBadRequestError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normalizePackageVersion(value) {
  const version = String(value || DEFAULT_PACKAGE_VERSION).trim();
  if (!PACKAGE_VERSION_PATTERN.test(version)) {
    throw createBadRequestError(
      'Package version must use three numeric segments, for example 0.0.1.'
    );
  }
  return version;
}

function applyPreDistillMetadata(spec, body) {
  const packageVersion = normalizePackageVersion(body.packageVersion);
  const skillName = String(body.skillName || '').trim();
  const nextSpec = {
    ...spec,
    package_version: packageVersion,
  };

  if (skillName) {
    nextSpec.id = toKebabCase(skillName);
    nextSpec.title = `${skillName} Skill`;
  }

  return nextSpec;
}

function createRunId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function countChapterNodes(chapters) {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return 0;
  }

  let total = 0;
  for (const chapter of chapters) {
    const childChapters = Array.isArray(chapter.children) ? chapter.children : [];
    total += 1;
    total += countChapterNodes(childChapters);
  }
  return total;
}

function computeOutlineDepth(chapters, depth = 1) {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return 0;
  }

  let maxDepth = depth;
  for (const chapter of chapters) {
    const childChapters = Array.isArray(chapter.children) ? chapter.children : [];
    const childDepth = computeOutlineDepth(childChapters, depth + 1);
    if (childDepth > maxDepth) {
      maxDepth = childDepth;
    }
  }
  return maxDepth;
}

async function handleDistill(body, options) {
  if (body.distillInput) {
    const result = await createSkillSpecFromFragments(body.distillInput);
    return {
      spec: applyPreDistillMetadata(result.spec, body),
      warnings: result.warnings,
      document: null,
    };
  }

  if (!body.fileName || !body.contentBase64) {
    throw new Error('Request must include distillInput or fileName with contentBase64.');
  }

  await fs.mkdir(options.outputRoot, { recursive: true });
  const uploadDir = await fs.mkdtemp(path.join(options.outputRoot, 'upload-'));
  const uploadedPath = path.join(uploadDir, safeFileName(body.fileName));
  await fs.writeFile(uploadedPath, Buffer.from(body.contentBase64, 'base64'));

  const extracted = await extractDocumentText(uploadedPath);
  const distillInput = createDistillInputFromDocumentText({
    fileName: extracted.fileName,
    sourceType: extracted.sourceType,
    text: extracted.text,
    title: body.title || path.basename(extracted.fileName, path.extname(extracted.fileName)),
    chapters: extracted.chapters,
    topic: body.topic,
    target_user: body.target_user,
  });
  const result = await createSkillSpecFromFragments(distillInput);
  const chapters = Array.isArray(extracted.chapters) ? extracted.chapters : [];

  return {
    spec: applyPreDistillMetadata(result.spec, body),
    warnings: [...extracted.warnings, ...result.warnings],
    document: {
      fileName: extracted.fileName,
      sourceType: extracted.sourceType,
      characters: extracted.text.length,
      chapters,
      chapterCount: countChapterNodes(chapters),
      outlineDepth: computeOutlineDepth(chapters),
    },
  };
}

async function handlePackage(body, options) {
  if (!body.spec || typeof body.spec !== 'object') {
    throw new Error('Request must include spec object.');
  }

  const runId = createRunId();
  const runDir = path.join(options.outputRoot, 'runs', runId);
  const specPath = path.join(runDir, 'spec.json');
  const packageDir = path.join(runDir, 'skill');

  await writeJson(specPath, body.spec);
  const generated = await createSkillPackageFromSpec(specPath, packageDir);
  const published = await publishSkillPackage(packageDir);

  return {
    runId,
    manifest: published.manifest,
    warnings: generated.warnings,
    archive: {
      path: published.archivePath,
      fileName: path.basename(published.archivePath),
      downloadUrl: `/downloads/${runId}/${encodeURIComponent(path.basename(published.archivePath))}`,
    },
  };
}

async function serveStatic(requestPath, response, options) {
  const publicRoot = path.join(options.rootDir, 'web', 'public');
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const resolvedPath = path.resolve(publicRoot, relativePath);
  const relativeToPublicRoot = path.relative(publicRoot, resolvedPath);

  if (relativeToPublicRoot.startsWith('..') || path.isAbsolute(relativeToPublicRoot)) {
    sendError(response, 403, 'Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(resolvedPath);
    if (!stat.isFile()) {
      sendError(response, 404, 'Not found');
      return;
    }
    const extension = resolvedPath.endsWith('.tar.gz') ? '.tar.gz' : path.extname(resolvedPath);
    response.writeHead(200, {
      'content-type': MIME_TYPES[extension] || 'application/octet-stream',
    });
    fss.createReadStream(resolvedPath).pipe(response);
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendError(response, 404, 'Not found');
      return;
    }
    throw error;
  }
}

async function serveDownload(requestPath, response, options) {
  const [, , runId, encodedFileName] = requestPath.split('/');
  const fileName = decodeURIComponent(encodedFileName || '');
  const resolvedPath = path.resolve(options.outputRoot, 'runs', runId || '', 'skill', 'dist', fileName);
  const allowedRoot = path.resolve(options.outputRoot, 'runs');

  if (!resolvedPath.startsWith(allowedRoot) || !fileName.endsWith('.tar.gz')) {
    sendError(response, 403, 'Forbidden');
    return;
  }

  try {
    await fs.access(resolvedPath);
    response.writeHead(200, {
      'content-type': 'application/gzip',
      'content-disposition': `attachment; filename="${fileName}"`,
    });
    fss.createReadStream(resolvedPath).pipe(response);
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendError(response, 404, 'Not found');
      return;
    }
    throw error;
  }
}

function createWebServer(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..');
  const outputRoot = options.outputRoot || path.join(rootDir, 'web-output');
  const serverOptions = { rootDir, outputRoot };

  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');

      if (request.method === 'GET' && url.pathname === '/api/example') {
        const examplePath = path.join(rootDir, 'distill-input.example.json');
        sendJson(response, 200, JSON.parse(await fs.readFile(examplePath, 'utf8')));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/distill') {
        const body = await readJsonRequest(request);
        sendJson(response, 200, await handleDistill(body, serverOptions));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/package') {
        const body = await readJsonRequest(request);
        sendJson(response, 200, await handlePackage(body, serverOptions));
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/downloads/')) {
        await serveDownload(url.pathname, response, serverOptions);
        return;
      }

      if (request.method === 'GET') {
        await serveStatic(url.pathname, response, serverOptions);
        return;
      }

      sendError(response, 405, 'Method not allowed');
    } catch (error) {
      sendError(response, error.statusCode || 500, error.message);
    }
  });
}

function startWebServer(options = {}) {
  const server = createWebServer(options);
  const port = options.port || DEFAULT_PORT;
  const host = options.host || '127.0.0.1';
  server.listen(port, host, () => {
    process.stdout.write(`Book-to-Skill Web running at http://${host}:${port}\n`);
  });
  return server;
}

if (require.main === module) {
  startWebServer();
}

module.exports = {
  createWebServer,
  startWebServer,
};
