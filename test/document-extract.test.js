const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');

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

async function hasEpubZipTooling() {
  const [hasZip, hasUnzip] = await Promise.all([hasCommand('zip'), hasCommand('unzip')]);
  return hasZip && hasUnzip;
}

function registerTempDirCleanup(t, tempDir) {
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });
}

async function writeTempFile(name, content, t) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-doc-extract-'));
  registerTempDirCleanup(t, tempDir);
  const filePath = path.join(tempDir, name);
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

async function writeTempEpubFile(t) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-epub-'));
  registerTempDirCleanup(t, tempDir);
  const epubPath = path.join(tempDir, 'habits.epub');
  await fs.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'OEBPS'), { recursive: true });
  await fs.writeFile(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf8');
  await fs.writeFile(
    path.join(tempDir, 'META-INF', 'container.xml'),
    [
      '<?xml version="1.0"?>',
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>',
      '</container>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapter.xhtml'),
    [
      '<html xmlns="http://www.w3.org/1999/xhtml"><body>',
      '<h1>Habit Design</h1>',
      '<p>Make cues obvious and actions easy.</p>',
      '<p>Identity comes before outcomes.</p>',
      '</body></html>',
    ].join(''),
    'utf8'
  );
  await execFileAsync('zip', ['-X', '-q', '-r', epubPath, 'mimetype', 'META-INF', 'OEBPS'], {
    cwd: tempDir,
  });
  return epubPath;
}

async function writeTempEpubFileWithNestedToc(t) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-epub-toc-'));
  registerTempDirCleanup(t, tempDir);
  const epubPath = path.join(tempDir, 'nested-toc.epub');
  await fs.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'OEBPS', 'chapters'), { recursive: true });
  await fs.writeFile(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf8');
  await fs.writeFile(
    path.join(tempDir, 'META-INF', 'container.xml'),
    [
      '<?xml version="1.0"?>',
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>',
      '</container>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'content.opf'),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<package version="3.0" xmlns="http://www.idpf.org/2007/opf">',
      '<manifest>',
      '<item id="nav" properties="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c1" href="chapters/ch1.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c2" href="chapters/ch2.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c2a" href="chapters/ch2a.xhtml" media-type="application/xhtml+xml"/>',
      '</manifest>',
      '<spine>',
      '<itemref idref="c1"/>',
      '<itemref idref="c2"/>',
      '<itemref idref="c2a"/>',
      '</spine>',
      '</package>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'nav.xhtml'),
    [
      '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Atomic Habits TOC</title></head><body>',
      '<nav epub:type="toc" id="toc">',
      '<h1>Atomic Habits TOC</h1>',
      '<ol>',
      '<li><a href="chapters/ch1.xhtml">Chapter 1: Identity</a></li>',
      '<li>',
      '<a href="chapters/ch2.xhtml">Chapter 2: Environment</a>',
      '<ol><li><a href="chapters/ch2a.xhtml">Chapter 2.1: Make it Easy</a></li></ol>',
      '</li>',
      '</ol>',
      '</nav>',
      '</body></html>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch1.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Identity</h1><p>Be the type of person who does not miss twice.</p></body></html>',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch2.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Environment</h1><p>Make good habits obvious and visible.</p></body></html>',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch2a.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Make it Easy</h1><p>Reduce friction to start immediately.</p></body></html>',
    'utf8'
  );

  await execFileAsync('zip', ['-X', '-q', '-r', epubPath, 'mimetype', 'META-INF', 'OEBPS'], {
    cwd: tempDir,
  });
  return epubPath;
}

async function writeTempEpubFileWithNcxToc(t) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-epub-ncx-'));
  registerTempDirCleanup(t, tempDir);
  const epubPath = path.join(tempDir, 'ncx-toc.epub');
  await fs.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'OEBPS', 'chapters'), { recursive: true });
  await fs.writeFile(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf8');
  await fs.writeFile(
    path.join(tempDir, 'META-INF', 'container.xml'),
    [
      '<?xml version="1.0"?>',
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>',
      '</container>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'content.opf'),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<package version="2.0" xmlns="http://www.idpf.org/2007/opf">',
      '<manifest>',
      '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
      '<item id="c1" href="chapters/ch1.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c2" href="chapters/ch2.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c2a" href="chapters/ch2a.xhtml" media-type="application/xhtml+xml"/>',
      '</manifest>',
      '<spine toc="ncx">',
      '<itemref idref="c1"/>',
      '<itemref idref="c2"/>',
      '<itemref idref="c2a"/>',
      '</spine>',
      '</package>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'toc.ncx'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/">',
      '<docTitle><text>NCX Habits TOC</text></docTitle>',
      '<navMap>',
      '<navPoint id="navPoint-1" playOrder="1">',
      '<navLabel><text>NCX Chapter 1: Identity</text></navLabel>',
      '<content src="chapters/ch1.xhtml"/>',
      '</navPoint>',
      '<navPoint id="navPoint-2" playOrder="2">',
      '<navLabel><text>NCX Chapter 2: Environment</text></navLabel>',
      '<content src="chapters/ch2.xhtml"/>',
      '<navPoint id="navPoint-2-1" playOrder="3">',
      '<navLabel><text>NCX Chapter 2.1: Make it Easy</text></navLabel>',
      '<content src="chapters/ch2a.xhtml"/>',
      '</navPoint>',
      '</navPoint>',
      '<navPoint id="navPoint-missing" playOrder="4">',
      '<navLabel><text>Missing NCX Chapter</text></navLabel>',
      '<content src="chapters/missing.xhtml"/>',
      '</navPoint>',
      '</navMap>',
      '</ncx>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch1.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Identity</h1><p>NCX identity text should be extracted.</p></body></html>',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch2.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Environment</h1><p>NCX environment text should be extracted.</p></body></html>',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch2a.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Make it Easy</h1><p>NCX child text should be extracted.</p></body></html>',
    'utf8'
  );

  await execFileAsync('zip', ['-X', '-q', '-r', epubPath, 'mimetype', 'META-INF', 'OEBPS'], {
    cwd: tempDir,
  });
  return epubPath;
}

async function writeTempEpubFileWithUnsafeAndMissingTocLeaves(t) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-epub-toc-safe-'));
  registerTempDirCleanup(t, tempDir);
  const epubPath = path.join(tempDir, 'unsafe-missing-toc.epub');
  await fs.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'OEBPS', 'chapters'), { recursive: true });
  await fs.writeFile(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf8');
  await fs.writeFile(
    path.join(tempDir, 'META-INF', 'container.xml'),
    [
      '<?xml version="1.0"?>',
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>',
      '</container>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'content.opf'),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<package version="3.0" xmlns="http://www.idpf.org/2007/opf">',
      '<manifest>',
      '<item id="nav" properties="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c1" href="chapters/ch1.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c3a" href="chapters/ch3a.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c4" href="chapters/empty.xhtml" media-type="application/xhtml+xml"/>',
      '</manifest>',
      '<spine>',
      '<itemref idref="c1"/>',
      '<itemref idref="c3a"/>',
      '<itemref idref="c4"/>',
      '</spine>',
      '</package>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'nav.xhtml'),
    [
      '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Safety TOC</title></head><body>',
      '<nav epub:type="toc" id="toc"><h1>Safety TOC</h1><ol>',
      '<li><a href="chapters/ch1.xhtml">Chapter 1: Keep</a></li>',
      '<li><a href="chapters/missing.xhtml">Chapter 2: Missing Leaf</a></li>',
      '<li><a href="../../../chapters/ch1.xhtml">Traversal Leaf</a></li>',
      '<li><a href="/chapters/ch1.xhtml">Absolute Leaf</a></li>',
      '<li><a href="chapters\\ch1.xhtml">Backslash Leaf</a></li>',
      '<li><a href="chapters/parent-missing.xhtml">Part 3: Parent Missing</a>',
      '<ol><li><a href="chapters/ch3a.xhtml">Chapter 3.1: Keep Child</a></li></ol>',
      '</li>',
      '<li><a href="../-unsafe.xhtml">Unsafe Leaf</a></li>',
      '<li><a href="chapters/empty.xhtml">Chapter 4: Empty But Present</a></li>',
      '</ol></nav></body></html>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch1.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Keep</h1><p>This chapter should remain.</p></body></html>',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch3a.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Keep Child</h1><p>This child chapter should remain.</p></body></html>',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'empty.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body></body></html>',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, '-unsafe.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><p>UNSAFE LEAF CONTENT</p></body></html>',
    'utf8'
  );

  await execFileAsync('zip', ['-X', '-q', '-r', epubPath, 'mimetype', 'META-INF', 'OEBPS', '--', '-unsafe.xhtml'], {
    cwd: tempDir,
  });
  return epubPath;
}

async function writeTempEpubFileWithUnusableTocUsingHeadingHierarchy(t) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-epub-headings-'));
  registerTempDirCleanup(t, tempDir);
  const epubPath = path.join(tempDir, 'headings-unusable-toc.epub');
  await fs.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'OEBPS', 'chapters'), { recursive: true });
  await fs.writeFile(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf8');
  await fs.writeFile(
    path.join(tempDir, 'META-INF', 'container.xml'),
    [
      '<?xml version="1.0"?>',
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>',
      '</container>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'content.opf'),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<package version="3.0" xmlns="http://www.idpf.org/2007/opf">',
      '<manifest>',
      '<item id="nav" properties="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c1" href="chapters/ch1.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c2" href="chapters/ch2.xhtml" media-type="application/xhtml+xml"/>',
      '</manifest>',
      '<spine>',
      '<itemref idref="c1"/>',
      '<itemref idref="c2"/>',
      '</spine>',
      '</package>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'nav.xhtml'),
    [
      '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Broken TOC</title></head><body>',
      '<nav epub:type="toc" id="toc"><h1>Broken TOC</h1><ol>',
      '<li><a href="../../../chapters/ch1.xhtml">Traversal Link</a></li>',
      '<li><a href="chapters/missing.xhtml">Missing Chapter</a></li>',
      '</ol></nav>',
      '</body></html>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch1.xhtml'),
    [
      '<html xmlns="http://www.w3.org/1999/xhtml"><body>',
      '<h1>Part I: Foundations</h1>',
      '<p>Start with identity.</p>',
      '<h2>Chapter 1: Habit Loops</h2>',
      '<p>Cue, craving, response, reward.</p>',
      '<h2>Chapter 2: Environment Design</h2>',
      '<p>Shape surroundings to reduce friction.</p>',
      '</body></html>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch2.xhtml'),
    [
      '<html xmlns="http://www.w3.org/1999/xhtml"><body>',
      '<h1>Part II: Practice</h1>',
      '<p>Consistency over intensity.</p>',
      '</body></html>',
    ].join(''),
    'utf8'
  );

  await execFileAsync(
    'zip',
    [
      '-X',
      '-q',
      epubPath,
      'mimetype',
      'META-INF/container.xml',
      'OEBPS/content.opf',
      'OEBPS/nav.xhtml',
      'OEBPS/chapters/ch1.xhtml',
      'OEBPS/chapters/ch2.xhtml',
    ],
    { cwd: tempDir }
  );
  return epubPath;
}

async function writeTempEpubFileWithGenericTocTitleAndSpecificBodyHeading(t) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-epub-alias-'));
  registerTempDirCleanup(t, tempDir);
  const epubPath = path.join(tempDir, 'alias-title.epub');
  await fs.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'OEBPS', 'chapters'), { recursive: true });
  await fs.writeFile(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf8');
  await fs.writeFile(
    path.join(tempDir, 'META-INF', 'container.xml'),
    [
      '<?xml version="1.0"?>',
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>',
      '</container>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'content.opf'),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<package version="3.0" xmlns="http://www.idpf.org/2007/opf">',
      '<manifest>',
      '<item id="nav" properties="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c1" href="chapters/ch1.xhtml" media-type="application/xhtml+xml"/>',
      '</manifest>',
      '<spine>',
      '<itemref idref="c1"/>',
      '</spine>',
      '</package>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'nav.xhtml'),
    [
      '<html xmlns="http://www.w3.org/1999/xhtml"><body>',
      '<nav epub:type="toc" id="toc"><ol>',
      '<li><a href="chapters/ch1.xhtml">Section A</a></li>',
      '</ol></nav>',
      '</body></html>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch1.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Practice</h1><p>Repeat until the pattern feels automatic.</p></body></html>',
    'utf8'
  );

  await execFileAsync('zip', ['-X', '-q', '-r', epubPath, 'mimetype', 'META-INF', 'OEBPS'], {
    cwd: tempDir,
  });
  return epubPath;
}

async function writeTempEpubFileWithResolvedRelativeTocLink(t) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-epub-relative-toc-'));
  registerTempDirCleanup(t, tempDir);
  const epubPath = path.join(tempDir, 'relative-toc.epub');
  await fs.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'OEBPS', 'Text'), { recursive: true });
  await fs.writeFile(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf8');
  await fs.writeFile(
    path.join(tempDir, 'META-INF', 'container.xml'),
    [
      '<?xml version="1.0"?>',
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>',
      '</container>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'content.opf'),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<package version="3.0" xmlns="http://www.idpf.org/2007/opf">',
      '<manifest>',
      '<item id="nav" properties="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c1" href="Text/ch1.xhtml" media-type="application/xhtml+xml"/>',
      '</manifest>',
      '<spine><itemref idref="c1"/></spine>',
      '</package>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'nav.xhtml'),
    [
      '<html xmlns="http://www.w3.org/1999/xhtml"><body>',
      '<nav epub:type="toc" id="toc"><ol>',
      '<li><a href="../-unsafe.xhtml">Unsafe Leaf</a></li>',
      '<li><a href="../OEBPS/Text/ch1.xhtml">Resolved Relative Leaf</a></li>',
      '</ol></nav>',
      '</body></html>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'Text', 'ch1.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Resolved Relative</h1><p>Safe resolved relative links should hydrate.</p></body></html>',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, '-unsafe.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><p>UNSAFE LEAF CONTENT</p></body></html>',
    'utf8'
  );

  await execFileAsync('zip', ['-X', '-q', '-r', epubPath, 'mimetype', 'META-INF', 'OEBPS', '--', '-unsafe.xhtml'], {
    cwd: tempDir,
  });
  return epubPath;
}

async function writeTempEpubFileWithHeadingFallbackArchiveOrder(t) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-epub-heading-order-'));
  registerTempDirCleanup(t, tempDir);
  const epubPath = path.join(tempDir, 'heading-order.epub');
  await fs.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'OEBPS', 'chapters'), { recursive: true });
  await fs.writeFile(path.join(tempDir, 'mimetype'), 'application/epub+zip', 'utf8');
  await fs.writeFile(
    path.join(tempDir, 'META-INF', 'container.xml'),
    [
      '<?xml version="1.0"?>',
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>',
      '</container>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'content.opf'),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<package version="3.0" xmlns="http://www.idpf.org/2007/opf">',
      '<manifest>',
      '<item id="nav" properties="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c2" href="chapters/ch2.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c10" href="chapters/ch10.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="c1" href="chapters/ch1.xhtml" media-type="application/xhtml+xml"/>',
      '</manifest>',
      '<spine><itemref idref="c2"/><itemref idref="c10"/><itemref idref="c1"/></spine>',
      '</package>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'nav.xhtml'),
    [
      '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Broken TOC</title></head><body>',
      '<nav epub:type="toc" id="toc"><h1>Broken TOC</h1><ol>',
      '<li><a href="chapters/missing.xhtml">Missing</a></li>',
      '</ol></nav>',
      '</body></html>',
    ].join(''),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch1.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chapter One</h1><p>One body.</p></body></html>',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch2.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chapter Two</h1><p>Two body.</p></body></html>',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'OEBPS', 'chapters', 'ch10.xhtml'),
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chapter Ten</h1><p>Ten body.</p></body></html>',
    'utf8'
  );

  await execFileAsync(
    'zip',
    [
      '-X',
      '-q',
      epubPath,
      'mimetype',
      'META-INF/container.xml',
      'OEBPS/content.opf',
      'OEBPS/nav.xhtml',
      'OEBPS/chapters/ch2.xhtml',
      'OEBPS/chapters/ch10.xhtml',
      'OEBPS/chapters/ch1.xhtml',
    ],
    { cwd: tempDir }
  );
  return epubPath;
}

test('extractDocumentText reads plain text files', async (t) => {
  const filePath = await writeTempFile(
    'habits.txt',
    'Identity comes before outcomes.\nSmall habits compound over time.',
    t
  );
  const { extractDocumentText } = require('../src/document-extract');

  const result = await extractDocumentText(filePath);

  assert.equal(result.sourceType, 'txt');
  assert.match(result.text, /Identity comes before outcomes/);
  assert.deepEqual(result.warnings, []);
});

test('extractDocumentText reads markdown files', async (t) => {
  const filePath = await writeTempFile(
    'habits.md',
    '# Habit Design\n\nMake cues obvious.\n\nMake actions easy.',
    t
  );
  const { extractDocumentText } = require('../src/document-extract');

  const result = await extractDocumentText(filePath);

  assert.equal(result.sourceType, 'md');
  assert.match(result.text, /Habit Design/);
  assert.match(result.text, /Make actions easy/);
});

test('extractDocumentText reads epub files', async (t) => {
  if (!(await hasEpubZipTooling())) {
    t.skip('zip/unzip command not available in this environment');
  }

  const filePath = await writeTempEpubFile(t);
  const { extractDocumentText } = require('../src/document-extract');

  const result = await extractDocumentText(filePath);

  assert.equal(result.sourceType, 'epub');
  assert.match(result.text, /Habit Design/);
  assert.match(result.text, /Make cues obvious and actions easy/);
  assert.doesNotMatch(result.text, /<p>/);
});

test('extractDocumentText reads EPUB TOC as nested chapters and keeps TOC title', async (t) => {
  if (!(await hasEpubZipTooling())) {
    t.skip('zip/unzip command not available in this environment');
  }

  const filePath = await writeTempEpubFileWithNestedToc(t);
  const { extractDocumentText } = require('../src/document-extract');

  const result = await extractDocumentText(filePath);

  assert.equal(result.sourceType, 'epub');
  assert.equal(result.title, 'Atomic Habits TOC');
  assert.equal(Array.isArray(result.chapters), true);
  assert.equal(result.chapters.length, 2);
  assert.equal(result.chapters[0].title, 'Chapter 1: Identity');
  assert.match(result.chapters[0].text, /Be the type of person/);
  assert.equal(result.chapters[1].title, 'Chapter 2: Environment');
  assert.match(result.chapters[1].text, /Make good habits obvious and visible/);
  assert.equal(result.chapters[1].children.length, 1);
  assert.equal(result.chapters[1].children[0].title, 'Chapter 2.1: Make it Easy');
  assert.match(result.chapters[1].children[0].text, /Reduce friction to start immediately/);
  assert.match(result.text, /Be the type of person/);
  assert.match(result.text, /Reduce friction to start immediately/);
});

test('extractDocumentText reads EPUB NCX TOC as nested chapters and warns on missing content', async (t) => {
  if (!(await hasEpubZipTooling())) {
    t.skip('zip/unzip command not available in this environment');
  }

  const filePath = await writeTempEpubFileWithNcxToc(t);
  const { extractDocumentText } = require('../src/document-extract');

  const result = await extractDocumentText(filePath);

  assert.equal(result.sourceType, 'epub');
  assert.equal(result.title, 'NCX Habits TOC');
  assert.equal(Array.isArray(result.chapters), true);
  assert.equal(result.chapters.length, 2);
  assert.equal(result.chapters[0].title, 'NCX Chapter 1: Identity');
  assert.match(result.chapters[0].text, /NCX identity text should be extracted/);
  assert.equal(result.chapters[1].title, 'NCX Chapter 2: Environment');
  assert.match(result.chapters[1].text, /NCX environment text should be extracted/);
  assert.equal(result.chapters[1].children.length, 1);
  assert.equal(result.chapters[1].children[0].title, 'NCX Chapter 2.1: Make it Easy');
  assert.match(result.chapters[1].children[0].text, /NCX child text should be extracted/);
  assert.equal(JSON.stringify(result.chapters).includes('Missing NCX Chapter'), false);
  assert.equal(
    result.warnings.some((warning) => warning.includes('Missing NCX Chapter')),
    true
  );
});

test('extractDocumentText skips unsafe and missing TOC leaves while keeping valid nested children', async (t) => {
  if (!(await hasEpubZipTooling())) {
    t.skip('zip/unzip command not available in this environment');
  }

  const filePath = await writeTempEpubFileWithUnsafeAndMissingTocLeaves(t);
  const { extractDocumentText } = require('../src/document-extract');

  const result = await extractDocumentText(filePath);

  assert.equal(result.sourceType, 'epub');
  assert.equal(result.title, 'Safety TOC');
  assert.equal(result.chapters.length, 3);
  assert.equal(result.chapters[0].title, 'Chapter 1: Keep');
  assert.match(result.chapters[0].text, /This chapter should remain/);
  assert.equal(result.chapters[1].title, 'Part 3: Parent Missing');
  assert.equal(result.chapters[1].text, '');
  assert.equal(result.chapters[1].children.length, 1);
  assert.equal(result.chapters[1].children[0].title, 'Chapter 3.1: Keep Child');
  assert.match(result.chapters[1].children[0].text, /This child chapter should remain/);
  assert.equal(result.chapters[2].title, 'Chapter 4: Empty But Present');
  assert.equal(result.chapters[2].text, '');
  assert.equal(result.chapters[2].children.length, 0);
  assert.equal(JSON.stringify(result.chapters).includes('Missing Leaf'), false);
  assert.equal(JSON.stringify(result.chapters).includes('Unsafe Leaf'), false);
  assert.equal(JSON.stringify(result.chapters).includes('Traversal Leaf'), false);
  assert.equal(JSON.stringify(result.chapters).includes('Absolute Leaf'), false);
  assert.equal(JSON.stringify(result.chapters).includes('Backslash Leaf'), false);
  assert.equal(JSON.stringify(result.chapters).includes('UNSAFE LEAF CONTENT'), false);
  assert.match(result.text, /This chapter should remain/);
  assert.match(result.text, /This child chapter should remain/);
});

test('extractDocumentText builds nested chapters from headings when EPUB has no usable TOC', async (t) => {
  if (!(await hasEpubZipTooling())) {
    t.skip('zip/unzip command not available in this environment');
  }

  const filePath = await writeTempEpubFileWithUnusableTocUsingHeadingHierarchy(t);
  const { extractDocumentText } = require('../src/document-extract');

  const result = await extractDocumentText(filePath);

  assert.equal(result.sourceType, 'epub');
  assert.equal(Array.isArray(result.chapters), true);
  assert.equal(result.chapters.length, 2);
  assert.equal(result.chapters[0].title, 'Part I: Foundations');
  assert.match(result.chapters[0].text, /Start with identity/);
  assert.equal(result.chapters[0].children.length, 2);
  assert.equal(result.chapters[0].children[0].title, 'Chapter 1: Habit Loops');
  assert.match(result.chapters[0].children[0].text, /Cue, craving, response, reward/);
  assert.equal(result.chapters[0].children[1].title, 'Chapter 2: Environment Design');
  assert.match(result.chapters[0].children[1].text, /Shape surroundings to reduce friction/);
  assert.equal(result.chapters[1].title, 'Part II: Practice');
  assert.match(result.chapters[1].text, /Consistency over intensity/);
});

test('extractDocumentText keeps TOC title primary and stores specific body heading in alias_titles', async (t) => {
  if (!(await hasEpubZipTooling())) {
    t.skip('zip/unzip command not available in this environment');
  }

  const filePath = await writeTempEpubFileWithGenericTocTitleAndSpecificBodyHeading(t);
  const { extractDocumentText } = require('../src/document-extract');

  const result = await extractDocumentText(filePath);

  assert.equal(result.sourceType, 'epub');
  assert.equal(result.chapters.length, 1);
  assert.equal(result.chapters[0].title, 'Section A');
  assert.deepEqual(result.chapters[0].alias_titles, ['Practice']);
  assert.match(result.chapters[0].text, /Repeat until the pattern feels automatic/);
});

test('extractDocumentText hydrates TOC chapters from resolved safe relative hrefs', async (t) => {
  if (!(await hasEpubZipTooling())) {
    t.skip('zip/unzip command not available in this environment');
  }

  const filePath = await writeTempEpubFileWithResolvedRelativeTocLink(t);
  const { extractDocumentText } = require('../src/document-extract');

  const result = await extractDocumentText(filePath);

  assert.equal(result.sourceType, 'epub');
  assert.equal(result.chapters.length, 1);
  assert.equal(result.chapters[0].title, 'Resolved Relative Leaf');
  assert.match(result.chapters[0].text, /Safe resolved relative links should hydrate/);
  assert.equal(JSON.stringify(result.chapters).includes('Unsafe Leaf'), false);
  assert.equal(JSON.stringify(result.chapters).includes('UNSAFE LEAF CONTENT'), false);
});

test('extractDocumentText heading fallback preserves archive member order', async (t) => {
  if (!(await hasEpubZipTooling())) {
    t.skip('zip/unzip command not available in this environment');
  }

  const filePath = await writeTempEpubFileWithHeadingFallbackArchiveOrder(t);
  const { extractDocumentText } = require('../src/document-extract');

  const result = await extractDocumentText(filePath);

  assert.equal(result.sourceType, 'epub');
  assert.equal(result.chapters.length, 3);
  assert.equal(result.chapters[0].title, 'Chapter Two');
  assert.equal(result.chapters[1].title, 'Chapter Ten');
  assert.equal(result.chapters[2].title, 'Chapter One');
});

test('createDistillInputFromDocumentText turns extracted text into structured fragments', () => {
  const { createDistillInputFromDocumentText } = require('../src/document-extract');

  const result = createDistillInputFromDocumentText({
    title: 'Atomic Habits Notes',
    sourceType: 'md',
    text: [
      '# Identity first',
      'Decide who you want to become before optimizing outcomes.',
      '',
      '# Environment design',
      'Make good habits visible and easy to start.',
    ].join('\n'),
  });

  assert.equal(result.book_title, 'Atomic Habits Notes');
  assert.equal(result.source_type, 'md');
  assert.equal(result.fragments.length >= 2, true);
  assert.equal(result.fragments[0].type, 'summary');
  assert.match(result.fragments[0].content, /Decide who you want/);
});

test('createDistillInputFromDocumentText keeps EPUB chapters and builds chapter-aware fragments', async (t) => {
  if (!(await hasEpubZipTooling())) {
    t.skip('zip/unzip command not available in this environment');
  }

  const filePath = await writeTempEpubFileWithNestedToc(t);
  const { createDistillInputFromDocumentText, extractDocumentText } = require('../src/document-extract');
  const extracted = await extractDocumentText(filePath);

  const result = createDistillInputFromDocumentText({
    fileName: extracted.fileName,
    sourceType: extracted.sourceType,
    text: extracted.text,
    title: extracted.title,
    chapters: extracted.chapters,
  });

  assert.deepEqual(result.chapters, extracted.chapters);
  assert.equal(result.fragments.some((fragment) => fragment.title === 'Chapter 1: Identity'), true);
  assert.equal(
    result.fragments.some((fragment) => fragment.title === 'Chapter 2.1: Make it Easy'),
    true
  );
});

test('extractDocumentText throws DocumentExtractError with status 400 for empty extracted text', async (t) => {
  const filePath = await writeTempFile('empty.txt', '   \n\n  ', t);
  const { extractDocumentText } = require('../src/document-extract');

  await assert.rejects(
    extractDocumentText(filePath),
    (error) =>
      error &&
      error.name === 'DocumentExtractError' &&
      error.statusCode === 400 &&
      /No readable text extracted/.test(error.message)
  );
});
