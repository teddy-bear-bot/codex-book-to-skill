# Book-to-Skill

Book-to-Skill 是一个面向个人创作者的非商业开源项目。它将一本书中的方法论蒸馏为平台无关的 Skill Spec，帮助用户把“读过的书”沉淀为可调用、可分享、可迁移的 AI 能力资产。

## 项目目标

- 从 PDF / EPUB 中提取结构化内容
- 识别书中的方法论、步骤、原则和边界
- 生成平台无关的 Skill Spec
- 提供编辑、测试、发布和导出能力
- 逐步形成开源的 Skill 适配与自部署生态

## 核心理念

- 输出对象不是摘要，而是可执行 Skill
- 开源的是工具链、协议与工作流，不是受版权保护的原始内容
- 优先保证 Skill Spec 和导出层的开放性
- 不依赖单一模型厂商或单一平台能力

## 当前范围

MVP 聚焦以下闭环：

1. 上传书籍
2. 解析文本与章节
3. 蒸馏方法论
4. 生成 Skill Spec
5. 编辑与 Playground 测试
6. 公开发布与导出

## 非目标

- 商业化与功能分层
- 书籍全文公开分发
- 团队协作系统
- 外部阅读平台深度集成
- 一开始就适配所有 AI 平台

## 文档

- PRD: [book-to-skill-prd.md](./book-to-skill-prd.md)
- 架构说明: [ARCHITECTURE.md](./ARCHITECTURE.md)
- 自部署说明: [SELF_HOSTING.md](./SELF_HOSTING.md)
- 项目路线图: [ROADMAP.md](./ROADMAP.md)
- Skill 协议: [SKILL_SPEC.md](./SKILL_SPEC.md)
- Skill 包规范: [SKILL_PACKAGE.md](./SKILL_PACKAGE.md)
- 导出适配层: [EXPORT_ADAPTERS.md](./EXPORT_ADAPTERS.md)
- Skill 包 schema: [skill-package.schema.json](./skill-package.schema.json)
- Skill 包示例目录: [skill-package.example](./skill-package.example)
- Markdown 导出示例: [generic-markdown.example.md](./generic-markdown.example.md)
- Markdown 导出结果示例: [export-generic-markdown-result.example.json](./export-generic-markdown-result.example.json)
- 贡献指南: [CONTRIBUTING.md](./CONTRIBUTING.md)
- 治理说明: [GOVERNANCE.md](./GOVERNANCE.md)

## 开源边界

本仓库默认不包含：

- 未经授权的书籍原文
- 用户上传文件
- 私有模型密钥
- 含个人隐私的使用数据

示例数据应优先使用公共领域文本、自建样本或人工构造内容。

## 许可建议

建议采用：

- 代码：Apache-2.0
- 文档：CC BY 4.0

最终以仓库根目录中的许可证文件为准。

## 状态

当前已提供可运行的本地 CLI + Web MVP，适合继续迭代验证上传、蒸馏、封装与本地安装闭环。

## 当前可运行原型

当前已经有一个最小本地安装器原型，可用于安装示例 skill 包：

```bash
node src/cli.js distill ./distill-input.example.json --output ./distilled-spec.json
node src/cli.js from-spec ./skill-spec.example.json ./my-generated-skill
node src/cli.js init ./my-new-skill
node src/cli.js install ./skill-package.example --store /tmp/book-to-skill-store
```

现在也提供一个本地 Web MVP：

```bash
npm run web
```

启动后访问：

```bash
http://127.0.0.1:8787
```

Web 版当前支持上传以下文档格式：

- `.pdf`
- `.epub`
- `.doc`
- `.docx`
- `.txt`
- `.md`

其中 EPUB 会按 `nav.xhtml` / `nav.html` / `toc.ncx` 等目录结构进行 chapter-aware 提取，尽量保留原书章节边界用于后续蒸馏；如果目录指向的正文文件缺失或链接不安全，会在 warnings 中提示并跳过对应章节。

Web 页面可完成：

- 上传文档
- （EPUB）章节大纲预览（chapter outline preview）
- 自动蒸馏为 `Skill Spec`
- 预览生成结果与 warnings
- 封装 skill 包
- 下载 `.tar.gz`

## CLI Chat 宿主快速开始

当前 CLI 侧已经支持一个宿主式交互入口：

```bash
book-to-skill chat <source-or-skill-id>
```

支持三类输入：

- 已安装的 skill 名：`book-to-skill chat pyramid-writing-skill`
- 本地包：`book-to-skill chat ./pyramid-writing-skill.tar.gz`
- 远程包：`book-to-skill chat https://example.com/pyramid-writing-skill.tar.gz`

如果输入的是本地或远程 `.tar.gz`：

- 默认先安装到当前用户目录：`~/.book-to-skill/skills`
- 加上 `--global` 时安装到全局目录
- 安装完成后进入宿主，由用户手动执行 `/skill` 选择当前要激活的 skill
- 选中 skill 后会同步到 Codex：`~/.codex/skills/<skill-id>`
- 同步成功后会打印 `Installed Codex skill: ...`
- 如果本机有 `codex` 命令，会自动启动 Codex
- 如果本机没有 `codex` 命令，会提示手动打开 Codex，并按 skill 名自然提需求

示例：

```bash
book-to-skill chat
book-to-skill chat ./pyramid-writing-skill.tar.gz
book-to-skill chat https://example.com/pyramid-writing-skill.tar.gz
book-to-skill chat ./pyramid-writing-skill.tar.gz --global
```

进入宿主后，核心命令为：

- `/skill`：列出并选择已安装的 skill
- `/help`：查看帮助
- `/info`：查看当前宿主状态
- `/inputs`：查看当前 skill 支持的输入字段
- `/reset`：清空当前 skill 会话上下文
- `/exit` / `/quit`：退出

推荐流程：

1. 先在 Web 端上传书籍并下载封装好的 `.tar.gz`
2. 运行 `book-to-skill chat ./your-skill.tar.gz`
3. 进入宿主后输入 `/skill`
4. 选择刚安装的 skill（会同步到 `~/.codex/skills/<skill-id>`）
5. 若检测到 `codex`，自动进入 Codex 并继续自然对话
6. 若未检测到 `codex`，手动打开 Codex 并按 skill 名自然提需求

如果上传了不支持的格式，接口会返回 `400`，并明确提示当前支持的文档类型。

如果你已经把书籍内容整理成结构化片段 JSON，可以先直接蒸馏成 `Skill Spec` 草稿：

```bash
node src/cli.js distill ./distill-input.example.json --output ./distilled-spec.json
node src/cli.js from-spec ./distilled-spec.json ./my-generated-skill
node src/cli.js publish ./my-generated-skill
```

如果只是想快速看一遍完整效果，可以直接运行仓库内演示脚本：

```bash
sh ./scripts/demo.sh make
```

或者：

```bash
npm run example
```

默认会把结果输出到 `./example-output/`，包含：

- `distilled-spec.json`
- `generated-skill/`
- `generated-skill/dist/*.tar.gz`

清理默认演示目录：

```bash
sh ./scripts/demo.sh clean
npm run example:clean
```

清理自定义目录：

```bash
sh ./scripts/demo.sh clean /tmp/book-to-skill-demo
```

重置目录并重新生成完整演示产物：

```bash
sh ./scripts/demo.sh reset
npm run example:reset
```

查看当前演示目录状态：

```bash
sh ./scripts/demo.sh status
npm run example:status
```

查看自定义目录状态：

```bash
sh ./scripts/demo.sh status /tmp/book-to-skill-demo
```

也可以用显式参数指定输出目录：

```bash
sh ./scripts/demo.sh make --output-dir /tmp/book-to-skill-demo
sh ./scripts/demo.sh status --output-dir /tmp/book-to-skill-demo
```

以 JSON 形式输出状态，便于被其他脚本消费：

```bash
sh ./scripts/demo.sh status --json
npm run example:status:json
```

首版 `distill` 输入要求包含：

- `book_title`
- `topic`
- `fragments`

其中 `fragments` 为数组，元素至少包含：

- `type`: `summary` 或 `excerpt`
- `title`
- `content`

`init` 会生成一个最小但合法的 skill 包骨架目录，随后可以直接 `inspect`、`pack` 或手工编辑：

```bash
node src/cli.js inspect ./my-new-skill
```

如果已经有一份 `Skill Spec`，也可以直接封装成 skill 包目录：

```bash
node src/cli.js from-spec ./skill-spec.example.json ./my-generated-skill
node src/cli.js inspect ./my-generated-skill
```

也可以先把 skill 包目录打成可分发的 `.tar.gz`：

```bash
node src/cli.js pack ./skill-package.example --output /tmp/pyramid-writing-skill-1.0.0.tar.gz
```

然后直接从归档安装：

```bash
node src/cli.js install /tmp/pyramid-writing-skill-1.0.0.tar.gz --store /tmp/book-to-skill-store
```

安装前，也可以先检查一个 skill 包来源是否合法：

```bash
node src/cli.js inspect ./skill-package.example
node src/cli.js inspect /tmp/pyramid-writing-skill-1.0.0.tar.gz
node src/cli.js inspect file:///path/to/skill-repo --ref v1.0.0
```

如果只想做严格校验，不看完整摘要，可以使用：

```bash
node src/cli.js validate ./skill-package.example
node src/cli.js validate ./skill-package.example --json
```

在准备打包或发布前，也可以先规范化 manifest 并生成最小锁文件：

```bash
node src/cli.js normalize ./my-new-skill
node src/cli.js lock ./my-new-skill
```

如果想一步完成本地发布流水线，可以直接执行：

```bash
node src/cli.js publish ./my-new-skill
```

默认会执行 `normalize -> validate -> lock -> pack`，并把产物输出到 `./my-new-skill/dist/`。

也支持从 git 仓库安装（当前已验证 `file://` 形式）：

```bash
node src/cli.js install file:///path/to/skill-repo --store /tmp/book-to-skill-store
```

如果 skill 在仓库子目录中：

```bash
node src/cli.js install file:///path/to/skills-repo --subdir skills/pyramid-writing-skill --store /tmp/book-to-skill-store
```

如果需要固定安装某个 git ref（例如分支或 tag）：

```bash
node src/cli.js install file:///path/to/skill-repo --ref v1.0.0 --store /tmp/book-to-skill-store
```

查看已安装 skill：

```bash
node src/cli.js list --store /tmp/book-to-skill-store
```

卸载 skill：

```bash
node src/cli.js uninstall pyramid-writing-skill@1.0.0 --store /tmp/book-to-skill-store
```

该命令会：

- 读取 `skill-package.example/skill.json`
- 校验必要文件
- 复制技能包到本地 store
- 写入 `registry.json`


配置完成:

-终端不启动cli，输入book-to-skill chat xxx.tar.gz文件。
-显示>host（此时出现提示：输入：/skill）。
-输入/skill后，显示Installed skills案例:
  - jrx-default@0.1.0
  - jysjfx-data@0.1.0
  - jrx@0.0.4
-显示host> （此时出现提示：输入：技能id，如jrx-default 或 id@version，如jrx-default@0.1.0）。
