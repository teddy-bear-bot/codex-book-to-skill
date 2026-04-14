# Roadmap

## 1. 目的

这份路线图用于把 Book-to-Skill 从“文档与协议阶段”推进到“可运行原型”和“开源发布阶段”。

它不追求列出所有未来可能性，而是回答三个现实问题：

1. 现在最先该做什么
2. 哪些事情必须形成闭环后才能进入下一阶段
3. 哪些功能应当延后，避免项目失焦

## 2. 当前状态

截至 `2026-04-08`，项目已经完成以下基础工作：

- 明确了产品方向和边界
- 完成了 PRD 初稿
- 完成了开源项目基础文档
- 定义了通用 `Skill Spec`
- 定义了导出适配层设计
- 提供了 JSON Schema、Spec 示例和 Markdown 导出示例

当前仍未完成：

- 解析流水线实现
- Skill 生成原型
- Playground 原型
- 导出器实现
- 自部署可运行工程

## 3. 路线图原则

- 先做协议闭环，再做产品外壳
- 先验证最小导出链路，再扩平台
- 先保证版权和边界，再追求炫技功能
- 先做单机可跑原型，再谈复杂部署
- 先做 maintainer-driven 的最小开源，再谈社区规模化

## 4. Phase 0：协议与文档闭环

### 目标

把项目从“想法”推进到“有统一语言的开源设计稿”。

### 完成标准

- PRD 完成并与开源方向一致
- README、架构、自部署、治理、贡献文档存在
- `Skill Spec` 已定义并可被示例验证
- 导出适配层原则已定义

### 当前状态

- 已完成

### 产物

- [book-to-skill-prd.md](./book-to-skill-prd.md)
- [README.md](./README.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SELF_HOSTING.md](./SELF_HOSTING.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [GOVERNANCE.md](./GOVERNANCE.md)
- [SKILL_SPEC.md](./SKILL_SPEC.md)
- [skill-spec.schema.json](./skill-spec.schema.json)
- [skill-spec.example.json](./skill-spec.example.json)
- [EXPORT_ADAPTERS.md](./EXPORT_ADAPTERS.md)
- [generic-markdown.example.md](./generic-markdown.example.md)

## 5. Phase 1：最小导出链路原型

### 目标

验证最核心的一条链路是否成立：

`手工或半手工输入 -> Skill Spec -> generic-markdown 导出`

### 为什么先做这一阶段

这是最小可验证链路。

如果这条链路都不稳定，后面做 PDF 解析、前端界面和平台适配都会建立在不稳定基础上。

### 范围

- 读取 `skill-spec.example.json`
- 实现一个 `generic-markdown` 导出器
- 输出与 [generic-markdown.example.md](./generic-markdown.example.md) 接近的结果
- 记录 `warnings` 和 `losses`

### 不做

- PDF 解析
- Web UI
- 多平台导出
- 用户系统

### 完成标准

- 可以通过命令行读取一个合法 Skill Spec
- 可以生成 Markdown artifact
- 导出结果有最小测试覆盖
- 导出错误和损耗可以被记录

### 关键产物

- `adapters/generic-markdown/*`
- 导出结果示例
- 导出器测试

## 6. Phase 2：Skill Spec 生成原型

### 目标

把“手工写 Skill Spec”推进到“半自动生成 Skill Spec”。

### 范围

- 支持输入人工整理的章节文本或结构化摘要
- 生成 `core_principles`
- 生成 `workflow`
- 生成 `constraints`
- 生成 `output_format`
- 输出完整 Skill Spec JSON

### 为什么不直接从 PDF 开始

因为 PDF 解析会混入太多噪音。

先验证蒸馏逻辑，能更快判断：

- Skill Spec 字段是否合理
- 方法论提取是否真的有价值
- 导出结果是否足够可用

### 不做

- 高质量 OCR
- 扫描版文档处理
- 复杂前端交互

### 完成标准

- 可以从一份结构化输入生成 Skill Spec 初稿
- 生成结果能通过 schema 校验
- 至少有 2 到 3 个不同主题的示例样本
- 生成结果能被导出器消费

## 7. Phase 3：书籍解析最小闭环

### 目标

从真实电子书输入推进到：

`PDF / EPUB -> 章节抽取 -> 方法论蒸馏 -> Skill Spec`

### 范围

- 文本型 PDF 解析
- EPUB 解析
- 章节目录识别
- 基础文本清洗
- 解析结果预览数据结构

### 风险点

- PDF 质量差异大
- 章节识别并不稳定
- 一些书不是方法论书，提取结果会天然稀薄

### 完成标准

- 至少支持文本型 PDF 和 EPUB
- 解析结果可输出结构化章节数据
- 蒸馏流程可在真实书籍上跑通
- 失败场景有明确错误信息

## 8. Phase 4：本地 Playground 原型

### 目标

验证 Skill 是否真的“可调用”，而不仅是“可读”。

### 范围

- 输入用户任务
- 读取 Skill Spec
- 输出结构化结果
- 展示采用了哪些原则和步骤

### 设计重点

- 先做本地或命令行 Playground
- 不要求完整 Web 体验
- 优先验证 Skill 的实用性，而不是 UI 完整度

### 完成标准

- 用户可以对一个 Skill 提交任务
- 系统可以返回结果和方法依据
- 至少支持 1 个演示场景

## 9. Phase 5：最小 Web 原型

### 目标

把核心流程包装成最小可体验的 Web 应用。

### 范围

- 上传页
- 解析结果页
- Skill 预览页
- 简化编辑器
- Playground 页面
- 公开展示页

### 不做

- 完整社区系统
- 推荐流
- 复杂账户系统
- 多租户能力

### 完成标准

- 用户可上传一本书
- 用户可看到生成的 Skill 初稿
- 用户可做少量编辑
- 用户可在浏览器中测试和查看结果
- 用户可获取一个公开链接

## 10. Phase 6：开源仓库发布

### 目标

把项目从私有文档状态推进到可公开协作状态。

### 范围

- 整理仓库结构
- 提供最小可运行说明
- 加入 License、贡献指南、治理文档
- 清理私有或不适合公开的数据
- 提供基础 issue / PR 模板

### 完成标准

- 新人能在不依赖作者口头解释的情况下理解项目
- 新人能跑起最小功能或最小 demo
- 仓库内不存在明显版权和密钥风险

## 11. Phase 7：自部署与首批适配器

### 目标

让项目具备真正的可迁移性和开源生命力。

### 范围

- 提供最小自部署方案
- 补充 `json-bundle` 导出器
- 补充至少 1 个平台导出器
- 增加基础观测和错误记录

### 完成标准

- 开发者可以在本地或简单服务器部署
- 至少有 2 到 3 个适配器可用
- 导出器能力边界清晰

## 12. Phase 8：社区扩展

### 目标

让项目从“作者驱动”逐步走向“社区可贡献”。

### 范围

- 模板贡献
- 平台适配器贡献
- 示例数据贡献
- 评估样例与回归测试补充

### 完成标准

- 外部贡献者可以独立补充适配器或模板
- 维护者可以稳定 review 和合并
- 核心协议保持稳定演进

## 13. 近期优先级

如果只看最近两到三轮开发，建议优先顺序如下：

1. 实现 `generic-markdown` 导出器
2. 写导出器测试
3. 定义导出器输出 JSON 结果示例
4. 实现 Skill Spec 半自动生成原型
5. 再进入 PDF / EPUB 解析

## 14. 明确延后项

以下内容当前应明确延后：

- 商业化设计
- 支付、订阅、定价
- 多人协作
- 推荐算法
- 社区首页
- 评论系统
- 一开始支持所有 AI 平台
- 扫描版 PDF 的重度 OCR 优化

## 15. 风险清单

在推进路线图时，需持续观察以下风险：

- 解析结果质量不稳定
- 蒸馏结果变成空泛摘要
- Skill Spec 设计过重，导致生成困难
- 导出器差异过大，导致协议被反向污染
- 开源前未处理好版权与示例数据边界

## 16. 一句话路线图总结

先把 `Skill Spec -> 导出器 -> Playground` 这条最小能力链路做稳，再把书籍解析和 Web 体验接上，最后再进入开源发布、自部署和适配器生态扩展。

