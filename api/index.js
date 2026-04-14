const os = require('node:os');
const path = require('node:path');

const { createWebServer } = require('../web/server');

const server = createWebServer({
  rootDir: path.resolve(__dirname, '..'),
  outputRoot: path.join(os.tmpdir(), 'book-to-skill-web-output'),
});

function normalizeRewrittenUrl(requestUrl) {
  const url = new URL(requestUrl, 'http://127.0.0.1');
  const rewrittenPath = url.searchParams.get('bts_path');

  if (!rewrittenPath) {
    return requestUrl;
  }

  url.searchParams.delete('bts_path');
  const query = url.searchParams.toString();
  const pathname = rewrittenPath.startsWith('/') ? rewrittenPath : `/${rewrittenPath}`;

  return query ? `${pathname}?${query}` : pathname;
}

module.exports = function handleVercelRequest(request, response) {
  request.url = normalizeRewrittenUrl(request.url || '/');
  server.emit('request', request, response);
};
