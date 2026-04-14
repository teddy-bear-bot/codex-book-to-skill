# GitHub Docs Light Cleanup Design

## Goal

在不大规模迁移文件结构的前提下，整理 `book-to-skill` 的对外文档，让 GitHub 访客在第一次进入仓库时能快速理解：

1. 这是什么项目
2. 现在已经能做什么
3. 我应该如何开始使用
4. 我如果想参与开发，应该看哪里

本次采用 **轻整理版（方案 A）**：保留现有文档文件名和主体位置，重点重构 `README.md` 的层次与导航，并清晰划分各文档职责。

## Audience

目标读者介于“首次访问的普通用户”和“准备贡献代码的开发者”之间，具体包括：

- 对项目感兴趣、想快速理解用途的 GitHub 访客
- 想试运行 Web / CLI / chat host 的使用者
- 想查看协议、架构或自部署说明的技术读者
- 想提交 issue / PR 的潜在贡献者

## Non-Goals

本次不做：

- 将所有文档迁移到新的 `docs/` 层级结构
- 大规模改名或重组 Markdown 文件
- 重写协议文档正文（如 `SKILL_SPEC.md`、`SKILL_PACKAGE.md`）
- 新增“营销型首页”所需的大量截图、徽章、发布资产
- 改动代码行为或 CLI / Web 功能本身

## Current Problems

根据现有仓库文档状态，当前主要问题有：

- `README.md` 信息量很大，但入口层次不够稳定，普通访问者不容易快速扫读
- 面向“使用”和“开发”的路径还不够明显
- 文档列表很多，但角色分工没有足够清楚地表达出来
- `README.md` 同时承担项目介绍、使用说明、架构概览、CLI 宿主说明，导致首页负担偏重
- GitHub 首页没有形成明确的“我下一步看哪里”的导航感

## Proposed Documentation Model

### 1. `README.md` 作为 GitHub 首页入口

`README.md` 应只做最关键的信息分发，覆盖：

- 一句话项目介绍
- 核心能力概览
- 当前状态（MVP / 原型能力）
- 快速开始
- “我想使用它” 与 “我想参与开发” 两条入口
- 文档地图
- 开源边界与许可证说明

控制原则：

- 首页优先可扫读
- 保留必要细节，但避免把所有说明堆在首页
- 让读者在 1～2 分钟内知道自己下一步该看哪份文档

### 2. `README-user-guide.md` 作为使用手册

这份文档继续承担面向使用者的说明，重点覆盖：

- Web 使用流程
- Skill 打包与下载
- CLI / chat host 使用方式
- 常见操作路径与常见问题

它不需要承担项目定位介绍，而应更像“操作手册”。

### 3. 其他文档职责保持稳定但更明确

- `CONTRIBUTING.md`：贡献流程与 PR 规则
- `ARCHITECTURE.md`：技术架构与模块分层
- `SELF_HOSTING.md`：部署、自托管与环境配置
- `ROADMAP.md`：路线图与阶段状态
- `SKILL_SPEC.md`：协议/规范
- `SKILL_PACKAGE.md`：Skill 包规范
- `EXPORT_ADAPTERS.md`：导出适配层说明

`README.md` 中应以“文档地图”方式重新组织这些链接，而不是平铺罗列。

## README Structure

建议 `README.md` 调整为以下顺序：

1. 项目标题与一句话介绍
2. What it does / 当前能做什么
3. Current status / 当前状态
4. Quick start / 快速开始
5. Two paths / 两条入口
   - 我想使用它
   - 我想参与开发
6. Documentation map / 文档地图
7. Open-source boundary / 开源边界
8. License / 许可证

其中：

- “快速开始” 控制在最短可运行路径
- 更详细的 Web / chat host 使用说明下放到 `README-user-guide.md`
- 首页保留 CLI / Web 的存在感，但不过度展开

## Content Changes

### README.md

需要重点调整：

- 开头段落：更简洁，突出“把书和文档变成可复用 Skill”
- 项目目标与核心理念：改成更适合首页阅读的短列表
- 当前可运行能力：压缩成能力概览
- 快速开始：只保留最关键命令和访问地址
- CLI Chat 宿主说明：保留摘要，详细流程跳转用户指南
- 文档链接：按角色和用途分组

### README-user-guide.md

建议增强：

- 明确写成“User Guide”
- 从“拿到 `.tar.gz` 后怎么用”开始组织
- 把 Web → 打包 → chat host → 选择 skill → 进入 Codex 串成顺手路径
- 可以增加一个简短 FAQ 区域

### CONTRIBUTING.md

建议仅做轻微补强：

- 补一个“开发者先读哪些文档”的小节
- 突出当前仓库已有的测试/验证习惯

## Writing Style

统一风格：

- 首页偏简洁、可扫读
- 使用文档偏步骤化
- 架构与规范文档偏准确与稳定
- 中英文不混乱；若当前仓库主要中文，就保持中文主体，英文命令与术语保留

## Testing / Verification

本次主要是文档整理，因此验证方式以人工检查为主：

- GitHub 首页是否能让人 1～2 分钟内理解项目
- 首页是否能清楚指向使用与开发两条路径
- README 链接是否都指向正确文档
- 文档之间职责是否更清楚、重叠是否减少

## Implementation Scope

建议本轮最小实施范围：

- 重写 `README.md`
- 轻量整理 `README-user-guide.md`
- 轻量整理 `CONTRIBUTING.md`

可选扩展：

- 给 `ARCHITECTURE.md`、`SELF_HOSTING.md`、`ROADMAP.md` 增加更统一的开头摘要

## Risks

- README 改得太短会丢失当前已有的重要信息
- README 改得太长会回到现在的入口混乱问题
- 若中英文定位不清晰，访客会分不清哪份文档先读

因此本次最重要的平衡是：

**首页足够清晰，但不过度承载细节。**

## Next Step

在你确认这份设计后，进入实现计划阶段，按轻整理版逐步改写：

- `README.md`
- `README-user-guide.md`
- `CONTRIBUTING.md`
