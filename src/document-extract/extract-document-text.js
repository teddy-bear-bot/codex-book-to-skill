const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.markdown']);
const SUPPORTED_DOCUMENT_EXTENSIONS = ['.pdf', '.epub', '.doc', '.docx', '.txt', '.md'];

class DocumentExtractError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'DocumentExtractError';
    this.statusCode = options.statusCode || 400;
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr || stdout || `Command failed: ${command}`));
    });
  });
}

function extensionToSourceType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.markdown') {
    return 'md';
  }
  return extension.replace(/^\./, '') || 'other';
}

function normalizeWhitespace(text) {
  return String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeXmlEntities(text) {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripMarkupText(text) {
  return normalizeWhitespace(
    decodeXmlEntities(
      String(text)
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<\/(p|div|section|article|chapter|h[1-6]|li|tr)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
    )
  );
}

async function commandExists(command) {
  try {
    await runCommand('command', ['-v', command], { shell: true });
    return true;
  } catch (_error) {
    return false;
  }
}

async function extractDocxXml(filePath) {
  const result = await runCommand('unzip', ['-p', filePath, 'word/document.xml']);
  const withBreaks = result.stdout
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<w:tab\/>/g, '\t');
  const stripped = withBreaks.replace(/<[^>]+>/g, '');
  return normalizeWhitespace(decodeXmlEntities(stripped));
}

async function extractEpubText(filePath, warnings = []) {
  const listed = await runCommand('unzip', ['-Z', '-1', filePath]);
  const listedFiles = listed.stdout
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const safeListedFiles = listedFiles.filter((item) => isSafeArchiveMemberPath(item));
  const documentFiles = safeListedFiles
    .filter((item) => /\.(xhtml|html|htm)$/i.test(item))
    .filter((item) => !/(^|\/)(nav|toc)\.(xhtml|html|htm)$/i.test(item));

  const navFile = safeListedFiles.find((item) => /(^|\/)(nav|toc)\.(xhtml|html|htm)$/i.test(item));
  const ncxFile =
    safeListedFiles.find((item) => /(^|\/)toc\.ncx$/i.test(item)) ||
    safeListedFiles.find((item) => /\.ncx$/i.test(item));

  if (navFile) {
    const navResult = await runCommand('unzip', ['-p', filePath, navFile]);
    const navDocument = navResult.stdout;
    const tocTitle = extractEpubTocTitle(navDocument);
    const rawChapters = extractEpubTocNodes(navDocument);
    const chapters = await hydrateEpubChapters(
      filePath,
      navFile,
      safeListedFiles,
      rawChapters,
      warnings
    );
    const flattenedChapterText = flattenChapterText(chapters);

    if (chapters.length > 0 && flattenedChapterText) {
      return {
        text: flattenedChapterText,
        title: tocTitle,
        chapters,
      };
    }
  }

  if (ncxFile) {
    const ncxResult = await runCommand('unzip', ['-p', filePath, ncxFile]);
    const ncxDocument = ncxResult.stdout;
    const tocTitle = extractEpubNcxTitle(ncxDocument);
    const rawChapters = extractEpubNcxNodes(ncxDocument);
    const chapters = await hydrateEpubChapters(
      filePath,
      ncxFile,
      safeListedFiles,
      rawChapters,
      warnings
    );
    const flattenedChapterText = flattenChapterText(chapters);

    if (chapters.length > 0 && flattenedChapterText) {
      return {
        text: flattenedChapterText,
        title: tocTitle,
        chapters,
      };
    }
  }

  if (documentFiles.length === 0) {
    return {
      text: '',
      title: undefined,
      chapters: undefined,
    };
  }

  const headingFallbackChapters = await extractHeadingBasedEpubChapters(filePath, documentFiles);
  if (headingFallbackChapters.length > 0) {
    const flattenedHeadingText = flattenChapterText(headingFallbackChapters);
    if (flattenedHeadingText) {
      return {
        text: flattenedHeadingText,
        title: undefined,
        chapters: headingFallbackChapters,
      };
    }
  }

  const extractedText = await extractEpubDocumentsText(filePath, documentFiles);
  return {
    text: extractedText,
    title: undefined,
    chapters: undefined,
  };
}

function extractEpubTocTitle(navDocument) {
  const tocTitleMatch = navDocument.match(/<nav\b[^>]*(?:epub:type\s*=\s*["']toc["']|id\s*=\s*["']toc["'])[^>]*>[\s\S]*?<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  if (tocTitleMatch) {
    return stripMarkupText(tocTitleMatch[1]);
  }

  const titleMatch = navDocument.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    return stripMarkupText(titleMatch[1]);
  }

  return undefined;
}

function extractEpubNcxTitle(ncxDocument) {
  const docTitleMatch = ncxDocument.match(/<docTitle\b[^>]*>[\s\S]*?<text\b[^>]*>([\s\S]*?)<\/text>[\s\S]*?<\/docTitle>/i);
  if (docTitleMatch) {
    return stripMarkupText(docTitleMatch[1]);
  }

  return undefined;
}

function extractEpubTocNodes(navDocument) {
  const tocNavMatch = navDocument.match(/<nav\b[^>]*(?:epub:type\s*=\s*["']toc["']|id\s*=\s*["']toc["'])[^>]*>([\s\S]*?)<\/nav>/i);
  const navContent = tocNavMatch ? tocNavMatch[1] : navDocument;
  const tokenRegex = /<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>|<\/?ol\b[^>]*>|<\/?li\b[^>]*>/gi;
  const root = [];
  const listStack = [root];
  const liStack = [];
  let token;

  while ((token = tokenRegex.exec(navContent)) !== null) {
    const whole = token[0];
    const normalized = whole.toLowerCase();

    if (normalized.startsWith('<ol')) {
      const parentNode = liStack[liStack.length - 1];
      const childList = parentNode ? parentNode.children : listStack[listStack.length - 1];
      listStack.push(childList);
      continue;
    }

    if (normalized.startsWith('</ol')) {
      if (listStack.length > 1) {
        listStack.pop();
      }
      continue;
    }

    if (normalized.startsWith('<li')) {
      const currentList = listStack[listStack.length - 1];
      const node = { title: '', href: undefined, children: [] };
      currentList.push(node);
      liStack.push(node);
      continue;
    }

    if (normalized.startsWith('</li')) {
      liStack.pop();
      continue;
    }

    const currentNode = liStack[liStack.length - 1];
    if (!currentNode) {
      continue;
    }

    const href = normalizeChapterHref(token[2]);
    const title = stripMarkupText(token[3]);
    if (href) {
      currentNode.href = href;
    }
    if (title) {
      currentNode.title = title;
    }
  }

  return root.filter((node) => node.title || node.href || node.children.length > 0);
}

function extractNcxNavLabelText(labelMarkup) {
  const textMatch = String(labelMarkup).match(/<text\b[^>]*>([\s\S]*?)<\/text>/i);
  if (textMatch) {
    return stripMarkupText(textMatch[1]);
  }

  return stripMarkupText(labelMarkup);
}

function extractEpubNcxNodes(ncxDocument) {
  const navMapMatch = ncxDocument.match(/<navMap\b[^>]*>([\s\S]*?)<\/navMap>/i);
  const navMapContent = navMapMatch ? navMapMatch[1] : ncxDocument;
  const tokenRegex = /<navPoint\b[^>]*>|<\/navPoint>|<navLabel\b[^>]*>[\s\S]*?<\/navLabel>|<content\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*\/?>/gi;
  const root = [];
  const stack = [];
  let token;

  while ((token = tokenRegex.exec(navMapContent)) !== null) {
    const whole = token[0];
    const normalized = whole.toLowerCase();

    if (normalized.startsWith('<navpoint')) {
      const node = { title: '', href: undefined, children: [] };
      if (stack.length === 0) {
        root.push(node);
      } else {
        stack[stack.length - 1].children.push(node);
      }
      stack.push(node);
      continue;
    }

    if (normalized.startsWith('</navpoint')) {
      stack.pop();
      continue;
    }

    const currentNode = stack[stack.length - 1];
    if (!currentNode) {
      continue;
    }

    if (normalized.startsWith('<navlabel')) {
      const title = extractNcxNavLabelText(whole);
      if (title) {
        currentNode.title = title;
      }
      continue;
    }

    if (normalized.startsWith('<content')) {
      const href = normalizeChapterHref(token[2]);
      if (href) {
        currentNode.href = href;
      }
    }
  }

  return root.filter((node) => node.title || node.href || node.children.length > 0);
}

function normalizeChapterHref(href) {
  if (!href) {
    return '';
  }
  const trimmed = String(href).trim();
  const withoutHash = trimmed.split('#')[0];
  return withoutHash.split('?')[0];
}

function isSafeArchiveMemberPath(memberPath) {
  if (!memberPath) {
    return false;
  }

  const value = String(memberPath).trim();
  if (!value) {
    return false;
  }
  if (value.startsWith('-')) {
    return false;
  }
  if (value.includes('\0')) {
    return false;
  }
  if (value.includes('\\')) {
    return false;
  }
  if (value.startsWith('/')) {
    return false;
  }
  if (/^[a-zA-Z]:/.test(value)) {
    return false;
  }

  const segments = value.split('/').filter(Boolean);
  if (segments.includes('..')) {
    return false;
  }

  return true;
}

function resolveEpubLink(baseFile, href) {
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(baseFile), href));
  return joined.replace(/^\/+/, '');
}

function resolveSafeChapterPath(navFile, href) {
  const normalizedHref = normalizeChapterHref(href);
  if (!normalizedHref) {
    return undefined;
  }

  const rawHref = String(normalizedHref).trim();
  if (!rawHref) {
    return undefined;
  }
  if (rawHref.includes('\0')) {
    return undefined;
  }
  if (rawHref.includes('\\')) {
    return undefined;
  }
  if (rawHref.startsWith('/')) {
    return undefined;
  }
  if (/^[a-zA-Z]:/.test(rawHref)) {
    return undefined;
  }

  const resolvedPath = resolveEpubLink(navFile, rawHref);
  return isSafeArchiveMemberPath(resolvedPath) ? resolvedPath : undefined;
}

async function hydrateEpubChapters(filePath, navFile, listedFiles, chapters, warnings = []) {
  if (!chapters || chapters.length === 0) {
    return [];
  }

  const listedSet = new Set(listedFiles);
  const chapterPaths = new Set();
  collectChapterPaths(chapters, navFile, chapterPaths, listedSet, warnings);
  const chapterMetaByPath = new Map();

  for (const chapterPath of chapterPaths) {
    if (!listedSet.has(chapterPath)) {
      continue;
    }
    const result = await runCommand('unzip', ['-p', filePath, chapterPath]);
    const document = result.stdout;
    chapterMetaByPath.set(chapterPath, {
      text: stripMarkupText(document),
      bodyHeading: extractFirstBodyHeading(document),
    });
  }

  return attachChapterText(chapters, navFile, chapterMetaByPath);
}

function collectChapterPaths(chapters, navFile, chapterPaths, listedSet, warnings) {
  for (const chapter of chapters) {
    const chapterPath = resolveSafeChapterPath(navFile, chapter.href);
    if (chapterPath) {
      if (listedSet.has(chapterPath)) {
        chapterPaths.add(chapterPath);
      } else {
        warnings.push(
          `Skipped EPUB TOC entry "${chapter.title || chapter.href}" because linked content "${chapter.href}" was not found.`
        );
      }
    } else if (chapter.href) {
      warnings.push(
        `Skipped EPUB TOC entry "${chapter.title || chapter.href}" because linked content "${chapter.href}" could not be resolved safely.`
      );
    }
    if (chapter.children.length > 0) {
      collectChapterPaths(chapter.children, navFile, chapterPaths, listedSet, warnings);
    }
  }
}

function attachChapterText(chapters, navFile, chapterMetaByPath) {
  return chapters.flatMap((chapter) => {
    const chapterPath = resolveSafeChapterPath(navFile, chapter.href);
    const memberExists = Boolean(chapterPath) && chapterMetaByPath.has(chapterPath);
    const chapterMeta = memberExists ? chapterMetaByPath.get(chapterPath) : undefined;
    const text = chapterMeta ? chapterMeta.text : '';
    const children = attachChapterText(chapter.children, navFile, chapterMetaByPath);
    const node = {
      title: chapter.title,
      href: chapter.href,
      text: text || '',
      children,
    };
    if (shouldIncludeAliasTitle(chapter.title, chapterMeta && chapterMeta.bodyHeading)) {
      node.alias_titles = [chapterMeta.bodyHeading];
    }

    const hasText = Boolean(normalizeWhitespace(node.text));
    if (memberExists || hasText || node.children.length > 0) {
      return [node];
    }
    return [];
  });
}

async function extractHeadingBasedEpubChapters(filePath, documentFiles) {
  const chapterRoots = [];
  for (const documentPath of documentFiles) {
    const result = await runCommand('unzip', ['-p', filePath, documentPath]);
    const documentChapters = extractHeadingChaptersFromDocument(result.stdout, documentPath);
    chapterRoots.push(...documentChapters);
  }
  return chapterRoots;
}

async function extractEpubDocumentsText(filePath, documentFiles) {
  const parts = [];
  for (const documentPath of documentFiles) {
    const extracted = await runCommand('unzip', ['-p', filePath, documentPath]);
    const text = stripMarkupText(extracted.stdout);
    if (text) {
      parts.push(text);
    }
  }
  return normalizeWhitespace(parts.join('\n\n'));
}

function extractHeadingChaptersFromDocument(document, href) {
  const headingRegex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(document)) !== null) {
    const level = Number(match[1]);
    const title = stripMarkupText(match[2]);
    if (!title) {
      continue;
    }
    headings.push({
      level,
      title,
      tagStart: match.index,
      tagEnd: headingRegex.lastIndex,
    });
  }

  if (headings.length === 0) {
    return [];
  }

  const roots = [];
  const stack = [];

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const nextHeading = headings[index + 1];
    const contentEnd = nextHeading ? nextHeading.tagStart : document.length;
    const sectionText = stripMarkupText(document.slice(heading.tagEnd, contentEnd));
    const node = {
      title: heading.title,
      href,
      text: normalizeWhitespace([heading.title, sectionText].filter(Boolean).join('\n')),
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }
    stack.push({ level: heading.level, node });
  }

  return roots;
}

function extractFirstBodyHeading(document) {
  const match = String(document).match(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/i);
  if (!match) {
    return '';
  }
  return stripMarkupText(match[2]);
}

function shouldIncludeAliasTitle(primaryTitle, bodyHeadingTitle) {
  const tocTitle = normalizeWhitespace(primaryTitle || '');
  const bodyTitle = normalizeWhitespace(bodyHeadingTitle || '');

  if (!tocTitle || !bodyTitle) {
    return false;
  }
  if (tocTitle.localeCompare(bodyTitle, undefined, { sensitivity: 'accent' }) === 0) {
    return false;
  }

  const tocLooksGeneric = /^(chapter|part|section)\s+([0-9]+|[ivxlcdm]+|[a-z])([.:)\-\s]|$)/i.test(tocTitle);
  return tocLooksGeneric || bodyTitle.length > tocTitle.length;
}

function flattenChapterText(chapters) {
  const parts = [];
  appendChapterText(chapters, parts);
  return normalizeWhitespace(parts.join('\n\n'));
}

function appendChapterText(chapters, parts) {
  for (const chapter of chapters) {
    const content = normalizeWhitespace(chapter.text || '');
    if (content) {
      parts.push(content);
    }
    if (chapter.children.length > 0) {
      appendChapterText(chapter.children, parts);
    }
  }
}

async function extractWithTextutil(filePath) {
  const result = await runCommand('textutil', ['-convert', 'txt', '-stdout', filePath]);
  return normalizeWhitespace(result.stdout);
}

async function extractPdfText(filePath, warnings) {
  if (await commandExists('pdftotext')) {
    const result = await runCommand('pdftotext', ['-layout', filePath, '-']);
    return normalizeWhitespace(result.stdout);
  }

  warnings.push('PDF extraction used strings fallback because pdftotext is not available.');
  const result = await runCommand('strings', [filePath]);
  return normalizeWhitespace(result.stdout);
}

function createFragmentsFromText(text) {
  const paragraphs = normalizeWhitespace(text)
    .split(/\n\s*\n|(?=^#{1,3}\s+)/m)
    .map((item) => item.trim())
    .filter(Boolean);
  const source = paragraphs.length > 0 ? paragraphs : [normalizeWhitespace(text)];
  const fragments = [];

  for (const paragraph of source) {
    const titleMatch = paragraph.match(/^#{1,3}\s+(.+)$/m);
    const firstLine = paragraph.split('\n').find((line) => line.trim()) || 'Document fragment';
    const title = titleMatch ? titleMatch[1].trim() : firstLine.replace(/^#{1,6}\s+/, '').slice(0, 80);
    const content = paragraph
      .replace(/^#{1,6}\s+.+\n?/, '')
      .trim() || paragraph.replace(/^#{1,6}\s+/, '').trim();

    if (content) {
      fragments.push({
        type: 'summary',
        title: title || `Fragment ${fragments.length + 1}`,
        content,
        importance: Math.max(1, 5 - fragments.length),
      });
    }

    if (fragments.length >= 8) {
      break;
    }
  }

  return fragments.length > 0
    ? fragments
    : [
        {
          type: 'summary',
          title: 'Document summary',
          content: normalizeWhitespace(text),
          importance: 5,
        },
      ];
}

function appendChapterNodes(chapters, nodes) {
  for (const chapter of chapters) {
    nodes.push(chapter);
    const childChapters = Array.isArray(chapter.children) ? chapter.children : [];
    if (childChapters.length > 0) {
      appendChapterNodes(childChapters, nodes);
    }
  }
}

function createFragmentsFromChapters(chapters) {
  const chapterNodes = [];
  appendChapterNodes(chapters, chapterNodes);
  const fragments = [];

  for (const chapter of chapterNodes) {
    const content = normalizeWhitespace(chapter.text || '');
    if (!content) {
      continue;
    }
    const title = normalizeWhitespace(chapter.title || '');

    fragments.push({
      type: 'summary',
      title: title || `Fragment ${fragments.length + 1}`,
      content,
      importance: Math.max(1, 5 - fragments.length),
    });

    if (fragments.length >= 8) {
      break;
    }
  }

  return fragments;
}

async function extractDocumentText(filePath) {
  const resolvedFilePath = path.resolve(filePath);
  const extension = path.extname(resolvedFilePath).toLowerCase();
  const warnings = [];
  let text;
  let title;
  let chapters;

  if (TEXT_EXTENSIONS.has(extension)) {
    text = await fs.readFile(resolvedFilePath, 'utf8');
  } else if (extension === '.docx') {
    try {
      text = await extractDocxXml(resolvedFilePath);
    } catch (_error) {
      text = await extractWithTextutil(resolvedFilePath);
    }
  } else if (extension === '.doc') {
    text = await extractWithTextutil(resolvedFilePath);
  } else if (extension === '.pdf') {
    text = await extractPdfText(resolvedFilePath, warnings);
  } else if (extension === '.epub') {
    const epubData = await extractEpubText(resolvedFilePath, warnings);
    text = epubData.text;
    title = epubData.title;
    chapters = epubData.chapters;
  } else {
    throw new DocumentExtractError(
      `Unsupported document format: ${extension || 'unknown'}. Supported formats: ${SUPPORTED_DOCUMENT_EXTENSIONS.join(', ')}.`
    );
  }

  const normalizedText = normalizeWhitespace(text);
  if (!normalizedText) {
    throw new DocumentExtractError(`No readable text extracted from ${path.basename(resolvedFilePath)}`, {
      statusCode: 400,
    });
  }

  const result = {
    filePath: resolvedFilePath,
    fileName: path.basename(resolvedFilePath),
    sourceType: extensionToSourceType(resolvedFilePath),
    text: normalizedText,
    warnings,
  };

  if (title) {
    result.title = title;
  }
  if (chapters && chapters.length > 0) {
    result.chapters = chapters;
  }

  return result;
}

function createDistillInputFromDocumentText(document) {
  const title = document.title || path.basename(document.fileName || 'Uploaded Document', path.extname(document.fileName || ''));
  const sourceType = document.sourceType || 'other';
  const text = normalizeWhitespace(document.text);
  const chapters =
    Array.isArray(document.chapters) && document.chapters.length > 0 ? document.chapters : undefined;

  if (!text) {
    throw new Error('Document text is empty.');
  }

  const chapterFragments = chapters ? createFragmentsFromChapters(chapters) : [];
  const result = {
    book_title: title,
    topic: document.topic || 'document-method',
    target_user: document.target_user || '希望把文档方法论封装成可复用 skill 的用户',
    source_type: sourceType,
    scenarios: ['把文档中的方法、原则和步骤转化为可执行 Skill'],
    inputs: [
      {
        name: 'goal',
        description: '这次希望用该文档方法解决的具体目标。',
        required: true,
        type: 'string',
      },
      {
        name: 'context',
        description: '用户当前场景、限制条件和已有素材。',
        required: false,
        type: 'text',
      },
    ],
    fragments: chapterFragments.length > 0 ? chapterFragments : createFragmentsFromText(text),
  };

  if (chapters) {
    result.chapters = chapters;
  }

  return result;
}

module.exports = {
  createDistillInputFromDocumentText,
  DocumentExtractError,
  extractDocumentText,
  SUPPORTED_DOCUMENT_EXTENSIONS,
};
