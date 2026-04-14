# Architecture

## 1. 目标

Book-to-Skill 的架构目标是支持一个清晰、可替换、可自部署的流程：

1. 接收书籍文件
2. 提取结构化文本
3. 蒸馏方法论
4. 生成 Skill Spec
5. 提供测试、发布和导出能力

## 2. 架构原则

- 模块边界清晰
- 长任务异步化
- 模型供应商可替换
- 存储后端可替换
- 平台适配器模块化
- 默认支持自部署

## 3. 逻辑分层

### 3.1 Web Frontend

职责：

- 用户注册与登录
- 文件上传
- 解析结果预览
- Skill 编辑器
- Playground
- 发布页和公开访问页面

### 3.2 API Service

职责：

- 鉴权与会话管理
- 任务创建与编排
- Skill CRUD
- 发布与导出接口
- 对外统一 API

### 3.3 Worker Service

职责：

- 文件解析
- 文本分段与清洗
- 方法论蒸馏
- Skill Spec 生成
- 导出任务执行

### 3.4 Data Layer

职责：

- 用户与身份数据
- 书籍元数据
- 任务状态
- Skill 内容和版本
- 发布页配置

### 3.5 Object Storage

职责：

- 原始上传文件
- 中间产物
- 导出文件
- 发布素材

## 4. 核心领域模块

### 4.1 Ingestion

负责上传接入、文件校验、类型识别、任务初始化。

### 4.2 Extraction

负责从 PDF / EPUB 中抽取文本、目录和章节结构。

### 4.3 Distillation

负责识别核心命题、原则、步骤、边界、反模式与场景。

### 4.4 Skill Spec Engine

负责把蒸馏结果映射为平台无关的 Skill Spec。

### 4.5 Playground Engine

负责基于 Skill 和用户任务执行测试调用，并返回结果与方法依据。

### 4.6 Publisher

负责公开页生成、分享链接和访问控制。

### 4.7 Export Adapters

负责将通用 Skill Spec 转换为不同平台或格式的输出。

## 5. 典型数据流

### 5.1 从书到 Skill

1. 用户上传文件
2. API 创建解析任务
3. Worker 抽取文本和章节
4. Worker 执行方法论蒸馏
5. Worker 生成 Skill Spec
6. API 保存 Skill 与版本
7. 前端展示编辑与 Playground

### 5.2 从 Skill 到发布

1. 用户确认 Skill 内容
2. API 创建发布记录
3. Publisher 生成公开页数据
4. 系统返回公开链接

### 5.3 Skill 导出

1. 用户选择导出格式
2. API 创建导出任务
3. Worker 调用适配器生成文件
4. 对象存储保存导出结果
5. 前端提供下载入口

## 6. 建议的数据模型

最小实体：

- `User`
- `Book`
- `BookAsset`
- `ParseJob`
- `DistillationJob`
- `Skill`
- `SkillVersion`
- `PlaygroundRun`
- `PublishedSkill`
- `ExportJob`

## 7. 技术选型约束

当前阶段只定义约束，不锁定具体框架：

- Web 可使用任意现代前端框架
- API 可使用任意适合任务编排的服务框架
- Worker 应支持长任务和重试机制
- 数据库建议选择关系型数据库
- 对象存储建议兼容 S3 协议
- 队列建议支持重试、可观察性和死信处理

## 8. 安全与版权边界

- 默认不公开书籍全文
- 公开页只展示蒸馏后的方法论结果
- 原文引用应有长度和用途限制
- 上传文件访问必须有权限控制
- 模型密钥不得硬编码进仓库

## 9. 开源边界

建议开源：

- Skill Spec Schema
- 解析与蒸馏流水线框架
- 平台适配接口
- 自部署脚本

建议不进入仓库：

- 用户原始文件
- 私有数据样本
- 含版权风险的缓存内容

## 10. 后续扩展方向

- 多模型路由
- 社区模板库
- 更多 Skill 导出适配器
- 自部署安装器
- 插件化平台集成

