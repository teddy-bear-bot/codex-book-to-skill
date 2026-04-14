const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Readable, Writable } = require('node:stream');

const rootDir = path.resolve(__dirname, '..');

async function invokeHandler(handler, { method = 'GET', url = '/', streamBody = '', parsedBody } = {}) {
  const request = new Readable({
    read() {
      this.push(streamBody || null);
      this.push(null);
    },
  });
  request.method = method;
  request.url = url;
  request.headers = streamBody || parsedBody ? { 'content-type': 'application/json' } : {};
  if (parsedBody !== undefined) {
    request.body = parsedBody;
  }

  let statusCode = 200;
  const headers = {};
  let responseBody = '';
  let finished = false;
  const response = new Writable({
    write(chunk, encoding, callback) {
      responseBody += chunk.toString();
      callback();
    },
  });
  response.writeHead = (nextStatusCode, nextHeaders = {}) => {
    statusCode = nextStatusCode;
    Object.assign(headers, nextHeaders);
    return response;
  };
  response.setHeader = (name, value) => {
    headers[name.toLowerCase()] = value;
  };
  response.end = (chunk) => {
    if (chunk) {
      responseBody += chunk.toString();
    }
    if (!finished) {
      finished = true;
      response.emit('finish');
    }
    return response;
  };

  await new Promise((resolve) => {
    response.on('finish', resolve);
    handler(request, response);
  });

  return { statusCode, headers, body: responseBody };
}

test('Vercel deployment serves the web UI from web/public', async () => {
  const vercelConfig = JSON.parse(await fs.readFile(path.join(rootDir, 'vercel.json'), 'utf8'));
  const indexHtml = await fs.readFile(path.join(rootDir, vercelConfig.outputDirectory, 'index.html'), 'utf8');

  assert.equal(vercelConfig.framework, null);
  assert.equal(vercelConfig.outputDirectory, 'web/public');
  assert.match(indexHtml, /Book-to-Skill Web/);
});

test('Vercel deployment rewrites API requests to the serverless adapter', async () => {
  const vercelConfig = JSON.parse(await fs.readFile(path.join(rootDir, 'vercel.json'), 'utf8'));
  const handler = require('../api/index');
  const result = await invokeHandler(handler, { url: '/api/index?bts_path=/api/example' });
  const payload = JSON.parse(result.body);

  assert.deepEqual(vercelConfig.rewrites, [
    { source: '/api/:path*', destination: '/api/index?bts_path=/api/:path*' },
    { source: '/downloads/:path*', destination: '/api/index?bts_path=/downloads/:path*' },
  ]);
  assert.equal(result.statusCode, 200);
  assert.equal(payload.book_title, 'Atomic Habits');
});

test('Vercel adapter accepts parsed JSON request bodies', async () => {
  const handler = require('../api/index');
  const example = JSON.parse(await fs.readFile(path.join(rootDir, 'distill-input.example.json'), 'utf8'));
  const result = await invokeHandler(handler, {
    method: 'POST',
    url: '/api/index?bts_path=/api/distill',
    parsedBody: { distillInput: example },
  });
  const payload = JSON.parse(result.body);

  assert.equal(result.statusCode, 200);
  assert.equal(payload.spec.version, '1.0.0');
});
