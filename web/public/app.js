const distillForm = document.getElementById('distill-form');
const fileInput = document.getElementById('document-file');
const skillNameInput = document.getElementById('skill-name-input');
const packageVersionInput = document.getElementById('package-version-input');
const packageButton = document.getElementById('package-button');
const downloadLink = document.getElementById('download-link');
const statusBox = document.getElementById('status-box');
const warningsBox = document.getElementById('warnings-box');
const distillInputEditor = document.getElementById('distill-input-editor');
const specOutput = document.getElementById('spec-output');
const packageOutput = document.getElementById('package-output');
const chapterCountValue = document.getElementById('chapter-count');
const chapterDepthValue = document.getElementById('chapter-depth');
const chapterTree = document.getElementById('chapter-tree');

let currentSpec = null;
const CHAPTER_PREVIEW_MAX_LENGTH = 120;
const CHAPTER_TREE_MAX_NODES = 2000;
const CHAPTER_TREE_MAX_DEPTH = 12;

function setStatus(message, type = 'info') {
  statusBox.textContent = message;
  statusBox.dataset.type = type;
}

function setWarnings(warnings) {
  if (!warnings || warnings.length === 0) {
    warningsBox.textContent = '';
    warningsBox.hidden = true;
    return;
  }
  warningsBox.hidden = false;
  warningsBox.textContent = warnings.map((warning) => `- ${warning}`).join('\n');
}

function setDownloadLink(url) {
  if (!url) {
    downloadLink.href = '#';
    downloadLink.setAttribute('aria-disabled', 'true');
    downloadLink.tabIndex = -1;
    downloadLink.classList.add('disabled');
    return;
  }
  downloadLink.href = url;
  downloadLink.setAttribute('aria-disabled', 'false');
  downloadLink.tabIndex = 0;
  downloadLink.classList.remove('disabled');
}

function truncatePreview(text, maxLength = CHAPTER_PREVIEW_MAX_LENGTH) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

function createChapterNode(chapter, depth, state) {
  const item = document.createElement('li');
  item.className = 'chapter-node';
  const childChapters = Array.isArray(chapter.children) ? chapter.children : [];
  const preview = truncatePreview(chapter.text);
  const hasDetails = Boolean(preview) || childChapters.length > 0;

  const titleRow = document.createElement('div');
  titleRow.className = 'chapter-title';

  let toggleButton = null;
  if (hasDetails) {
    toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'chapter-toggle';
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.textContent = '展开';
    titleRow.appendChild(toggleButton);
  }

  const titleText = document.createElement('strong');
  titleText.textContent = chapter.title || '未命名章节';
  titleRow.appendChild(titleText);

  if (Array.isArray(chapter.alias_titles) && chapter.alias_titles.length > 0) {
    const aliasText = document.createElement('span');
    aliasText.className = 'chapter-alias';
    aliasText.textContent = `别名：${chapter.alias_titles.join(' / ')}`;
    titleRow.appendChild(aliasText);
  }

  item.appendChild(titleRow);

  if (hasDetails) {
    const details = document.createElement('div');
    details.className = 'chapter-details';
    details.hidden = true;

    if (preview) {
      const previewText = document.createElement('p');
      previewText.className = 'chapter-preview';
      previewText.textContent = preview;
      details.appendChild(previewText);
    }

    if (childChapters.length > 0) {
      if (depth >= CHAPTER_TREE_MAX_DEPTH) {
        details.appendChild(createChapterNotice('章节层级过深，已截断显示。', false));
      } else {
        details.appendChild(renderChapterTree(childChapters, depth + 1, state));
      }
    }

    toggleButton.addEventListener('click', () => {
      const expanded = toggleButton.getAttribute('aria-expanded') === 'true';
      const nextExpanded = !expanded;
      toggleButton.setAttribute('aria-expanded', String(nextExpanded));
      toggleButton.textContent = nextExpanded ? '收起' : '展开';
      details.hidden = !nextExpanded;
    });

    item.appendChild(details);
  }

  return item;
}

function createChapterNotice(message, asListItem = true) {
  const notice = document.createElement(asListItem ? 'li' : 'p');
  notice.className = asListItem ? 'chapter-node chapter-node-notice' : 'chapter-node-notice';
  notice.textContent = message;
  return notice;
}

function renderChapterTree(chapters, depth = 1, state = { count: 0, maxReached: false }) {
  const list = document.createElement('ul');
  list.className = 'chapter-list';

  if (depth > CHAPTER_TREE_MAX_DEPTH) {
    list.appendChild(createChapterNotice('章节层级过深，已截断显示。'));
    return list;
  }

  let maxNoticeAdded = false;
  for (const chapter of chapters) {
    if (state.count >= CHAPTER_TREE_MAX_NODES) {
      state.maxReached = true;
      if (!maxNoticeAdded) {
        list.appendChild(createChapterNotice('章节节点过多，已截断显示。'));
        maxNoticeAdded = true;
      }
      break;
    }

    state.count += 1;
    const node = createChapterNode(chapter, depth, state);
    list.appendChild(node);
  }
  return list;
}

function clearChapterOutline(message = '暂无章节结构') {
  chapterCountValue.textContent = '-';
  chapterDepthValue.textContent = '-';
  chapterTree.textContent = message;
}

function renderChapterOutline(documentPayload) {
  const chapters = Array.isArray(documentPayload?.chapters) ? documentPayload.chapters : [];
  if (documentPayload?.sourceType !== 'epub' || chapters.length === 0) {
    clearChapterOutline();
    return;
  }

  chapterCountValue.textContent =
    Number.isFinite(documentPayload.chapterCount) ? String(documentPayload.chapterCount) : '-';
  chapterDepthValue.textContent =
    Number.isFinite(documentPayload.outlineDepth) ? String(documentPayload.outlineDepth) : '-';
  chapterTree.replaceChildren(renderChapterTree(chapters));
}

async function loadExample() {
  setStatus('加载示例中…');
  const response = await fetch('/api/example');
  const payload = await response.json();
  distillInputEditor.value = JSON.stringify(payload, null, 2);
  setStatus('示例已加载。');
  setWarnings([]);
}

async function readSelectedFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error('读取文件失败，请重试。'));
    };
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = dataUrl.indexOf(',');
      if (commaIndex < 0) {
        reject(new Error('无法解析文件内容。'));
        return;
      }
      resolve(dataUrl.slice(commaIndex + 1));
    };
    reader.readAsDataURL(file);
  });
}

async function distillFromJsonEditor() {
  const payload = JSON.parse(distillInputEditor.value);
  const response = await fetch('/api/distill', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      distillInput: payload,
      skillName: skillNameInput.value.trim() || undefined,
      packageVersion: packageVersionInput.value.trim() || undefined,
    }),
  });
  return response.json();
}

async function distillFromFile(file) {
  const contentBase64 = await readSelectedFileAsBase64(file);
  const response = await fetch('/api/distill', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentBase64,
      skillName: skillNameInput.value.trim() || undefined,
      packageVersion: packageVersionInput.value.trim() || undefined,
    }),
  });
  return response.json();
}

distillForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    setStatus('蒸馏中…');
    clearChapterOutline();
    packageButton.disabled = true;
    setDownloadLink('');
    packageOutput.value = '';

    const payload = fileInput.files && fileInput.files[0]
      ? await distillFromFile(fileInput.files[0])
      : await distillFromJsonEditor();

    if (payload.error) {
      throw new Error(payload.error);
    }

    currentSpec = payload.spec;
    specOutput.value = JSON.stringify(payload.spec, null, 2);
    renderChapterOutline(payload.document);
    setWarnings(payload.warnings || []);
    packageButton.disabled = false;
    setStatus('蒸馏完成。');
  } catch (error) {
    setStatus(`蒸馏失败：${error.message}`, 'error');
  }
});

packageButton.addEventListener('click', async () => {
  if (!currentSpec) {
    return;
  }

  try {
    setStatus('封装中…');
    const response = await fetch('/api/package', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ spec: currentSpec }),
    });
    const payload = await response.json();
    if (payload.error) {
      throw new Error(payload.error);
    }
    packageOutput.value = JSON.stringify(payload, null, 2);
    setWarnings(payload.warnings || []);
    setDownloadLink(payload.archive.downloadUrl);
    setStatus('封装完成，可下载 .tar.gz。');
  } catch (error) {
    setStatus(`封装失败：${error.message}`, 'error');
  }
});

loadExample().catch((error) => {
  setStatus(`初始化失败：${error.message}`, 'error');
});
