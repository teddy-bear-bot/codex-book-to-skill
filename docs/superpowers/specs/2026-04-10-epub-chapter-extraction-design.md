# EPUB 章节级提取设计

## 背景

当前 `Book-to-Skill` 已支持上传并解析 `.epub` 文件，但仍以“整本文本抽取 + 段落切分”为主。这样可以完成基础蒸馏，却无法较好保留 EPUB 原有的目录层级、章节标题与正文结构。

本次设计目标是在不破坏当前 CLI / Web MVP 闭环的前提下，为 EPUB 增加“章节级提取”能力，使导出的结构既适合蒸馏 `fragments`，也能保留独立的 `chapters` 元数据供前端展示和后续能力扩展。

## 设计目标

- 优先读取 EPUB 的 TOC / nav / `toc.ncx` 目录结构
- 当 TOC 缺失或信息不足时，回退使用正文中的 `h1/h2/h3...` 标题切分
- 尽量保留完整层级，而不是只截断为一级或二级章节
- 当 TOC 标题与正文标题不一致时，采用混合合并策略：
  - 默认以 TOC 命名为主
  - 当正文标题明显更具体时，将其补充为别名或补充标题
- 同时提升两类输出：
  - 改进蒸馏所用的 `fragments`
  - 独立保留 `chapters` 结构化元数据

## 非目标

- 不在本阶段实现 EPUB 的样式保真渲染
- 不在本阶段处理图片、脚注、批注、表格重建
- 不在本阶段做跨文档引用图谱
- 不在本阶段为所有格式统一提供章节树，仅先聚焦 EPUB

## 方案比较

### 方案 A：纯 TOC 驱动

直接以 EPUB 内的目录结构作为唯一章节来源。

优点：

- 层级稳定
- 贴近作者原始编排

缺点：

- 某些 EPUB 的 TOC 很粗糙、残缺，甚至缺失
- 正文中更具体的标题会被丢掉

### 方案 B：纯正文标题驱动

完全忽略 TOC，仅按正文中的 `h1/h2/h3...` 自动切分。

优点：

- 对 TOC 不规范的 EPUB 更稳健
- 能保留正文中的具体标题

缺点：

- 容易误切
- 无法准确恢复原始目录结构

### 方案 C：混合合并（推荐）

以 TOC 建立章节树，再用正文标题补齐和修正。

规则：

- 优先使用 TOC 结构
- 缺失章节时回退正文标题
- TOC 与正文标题冲突时，TOC 为主名，正文更具体标题进入 `alias_titles`

优点：

- 同时兼顾稳定性与信息量
- 最符合用户对“优先 TOC，缺失时回退正文标题”的要求

缺点：

- 实现复杂度高于前两者
- 需要额外的合并规则

## 推荐设计

采用方案 C：混合合并。

这是当前范围内最合适的折中方案，既能保留 EPUB 原始目录层级，也能从正文中恢复更丰富、更贴近真实阅读体验的章节语义。

## 抽取层设计

### 1. EPUB 结构读取

在 `extractDocumentText()` 的 EPUB 分支中扩展为结构化抽取流程：

1. 列出 EPUB 包内文件
2. 读取并解析 TOC 来源，优先级如下：
   - `nav.xhtml` / `nav.html`
   - `toc.ncx`
   - 若仍无目录，则降级为正文标题切分
3. 读取正文 XHTML/HTML 文件
4. 抽取每个正文文件中的标题、正文文本与锚点
5. 将 TOC 与正文通过 `href + anchor` 进行关联
6. 产出全文文本 `text` 与章节树 `chapters`

### 2. `chapters` 数据结构

每个章节节点建议包含：

```json
{
  "id": "chapter-1",
  "title": "Chapter 1",
  "alias_titles": ["Identity First"],
  "level": 1,
  "href": "OEBPS/ch1.xhtml#start",
  "text": "章节正文纯文本",
  "children": []
}
```

字段说明：

- `id`：抽取层生成的稳定节点标识
- `title`：主标题，默认来自 TOC
- `alias_titles`：正文中更具体或不同表述的标题
- `level`：目录层级
- `href`：原始 TOC 指向位置
- `text`：该章节正文纯文本
- `children`：子章节列表

### 3. 标题合并策略

合并规则：

- 若 TOC 与正文标题基本一致，则只保留 `title`
- 若正文标题更具体、更完整，则：
  - `title` 保持 TOC 命名
  - 正文标题写入 `alias_titles`
- 若 TOC 缺失某一层，允许根据正文标题插入补全节点

### 4. 全文文本 `text`

`text` 仍保留，作为兼容现有蒸馏流程的基础字段。其来源为章节树节点 `text` 的顺序拼接。

## 蒸馏输入设计

`createDistillInputFromDocumentText()` 在保持现有输出兼容的前提下扩展为：

- 继续输出 `fragments`
- 新增 `chapters` 元数据字段

建议结构：

```json
{
  "book_title": "Example",
  "source_type": "epub",
  "fragments": [],
  "chapters": []
}
```

## `fragments` 生成规则

章节感知后的 `fragments` 规则：

- 优先选择有正文内容的章节节点
- 优先使用叶子章节，避免大章节内容过于宽泛
- 若目录层级很深，则尽量保留更多节点，但蒸馏时可优先挑选正文更完整的节点
- `title` 默认取 `chapter.title`
- 若存在 `alias_titles`，可在蒸馏时作为补充上下文
- `content` 取该章节正文纯文本，必要时截断
- `importance` 可基于层级与顺序估算，例如：
  - 顶层章节更高
  - 靠前章节略高

## API 设计

`POST /api/distill` 的返回结构扩展为：

```json
{
  "spec": {},
  "warnings": [],
  "document": {
    "fileName": "example.epub",
    "sourceType": "epub",
    "characters": 12345,
    "chapterCount": 18,
    "outlineDepth": 4,
    "chapters": []
  }
}
```

新增字段：

- `chapterCount`：章节节点总数
- `outlineDepth`：最大层级深度
- `chapters`：完整章节树

兼容性要求：

- 保留原有 `spec` / `warnings` / `document.sourceType`
- 旧调用方不读取新增字段时不受影响

## Web 展示设计

在现有 Web 输出区域中新增“章节结构”面板：

- 默认折叠显示章节树
- 显示章节总数与最大层级深度
- 每个节点可展开查看：
  - 主标题
  - 别名标题
  - 截断后的正文预览

页面目标：

- 让用户在蒸馏前快速确认 EPUB 结构是否被正确理解
- 为后续“手工微调章节到 skill”的能力预留空间

## 错误与降级策略

- **有 TOC，正文文件缺失**：保留 TOC 结构并给出 warning
- **无 TOC，有正文标题**：回退正文标题建树
- **TOC 与正文无法稳定对齐**：以 TOC 为骨架，正文按最接近文件路径归并，并给出 warning
- **章节树为空但能抽出全文**：继续生成旧版 `fragments`，不阻断主流程
- **完全抽不到正文**：返回错误

## 测试策略

### 抽取层测试

- 有 TOC 的 EPUB 能正确返回 `chapters`
- 无 TOC 的 EPUB 能回退到正文标题切分
- TOC 与正文标题不同的 EPUB 能生成 `alias_titles`

### API 测试

- `/api/distill` 返回 `document.chapters`
- 返回 `chapterCount` 与 `outlineDepth`

### Web 回归

- 页面仍可正常上传 EPUB
- 章节结构数据存在时不影响原有打包下载流程

## 分阶段实施建议

### Phase 1

- 解析 TOC / nav
- 返回基础 `chapters`
- `fragments` 改为优先按章节生成

### Phase 2

- 支持正文标题回退建树
- 增加 `alias_titles` 合并规则

### Phase 3

- Web 端章节树折叠展示
- 展示章节统计信息与正文预览

## 风险

- EPUB 在不同制作工具下结构差异较大
- `nav.xhtml`、`toc.ncx`、正文文件之间的链接规范不完全一致
- 标题“更具体”的判断容易引入主观性，需要保持规则简单可解释

## 决策结果

- 提取策略：两者结合，优先 TOC，缺失时回退正文标题
- 输出策略：两者都要，既增强 `fragments`，也保留独立 `chapters`
- 层级策略：尽量全保留，由前端折叠展示
- 合并策略：混合合并，优先 TOC 命名，正文更具体时做别名或补充
