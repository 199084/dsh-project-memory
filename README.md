# dsh-project-memory

Human-owned, project-scoped memory for DeepSeek Harness.

Written by an AI agent on behalf of `199084`; the repository contents were reviewed by the account owner before publication.

> **让 DeepSeek Harness 记住项目，但不让模型成为项目记忆的所有者。**
>
> **Let the model remember your project without becoming the owner of its memory.**

`dsh-project-memory` 是一个面向 [DeepSeek Harness](https://github.com/deepseek-ai) 的项目级记忆插件。它把长期有效的项目知识保存在工作区根目录的 `MEMORY.md` 中，并将这些内容作为带有明确来源标记的运行时上下文提供给 Agent。

它的核心原则很简单：**记忆属于项目，也应当像代码一样可阅读、可审查、可追踪。** 模型可以读取和检索项目记忆，也可以提出修改建议，但插件不会允许模型静默改写长期记忆。任何真正的修改，都由人审核后通过 Git 提交。

`dsh-project-memory` is a project-scoped memory plugin for [DeepSeek Harness](https://github.com/deepseek-ai). It keeps durable project knowledge in a workspace-level `MEMORY.md` file and exposes that knowledge to the agent as clearly labeled runtime context.

The design principle is straightforward: **project memory should be readable, reviewable, and versioned like source code.** The agent can read and search memory and can suggest changes, but it cannot silently rewrite the long-term source of truth. A person reviews approved changes and commits them through Git.

## 它解决什么问题 | What it solves

AI Agent 在长时间、多轮次的项目工作中，经常会丢失已经确认的技术决策、产品约束和上下文。例如：

- 项目为什么选择某个技术方案？
- 哪些功能明确不能加入？
- 当前产品的目标用户和核心行为是什么？
- 哪些约束需要在每次会话中持续遵守？

传统的自动记忆系统通常会在后台提取、存储和召回事实，但这些内容可能过时、错误或难以追溯。`dsh-project-memory` 选择了更可控的边界：使用普通 Markdown 保存项目事实，让记忆能够随仓库版本化，并让每次注入都携带文件路径和修改时间。

During long, multi-turn development sessions, agents can lose decisions, constraints, and project context that were already established. Common examples include why a technology was chosen, which features are intentionally excluded, and which product rules must be followed in every session.

Many automatic memory systems extract and recall facts in the background, but those facts can become stale, incorrect, or difficult to audit. `dsh-project-memory` chooses a more controlled boundary: ordinary Markdown is the source of truth, memory travels with the repository, and every injection includes its file path and modification time.

## 核心能力 | Core capabilities

- **项目级隔离 | Workspace isolation**：每个工作区使用自己的 `MEMORY.md`，不同项目之间不会混用规则或事实。
- **带来源的上下文注入 | Provenance-aware injection**：注入内容明确标出来源路径和最后修改时间，方便判断信息是否仍然有效。
- **只读记忆工具 | Read-only lookup tool**：通过 `project_memory` 按关键词检索相关记忆，并返回匹配的行号，便于定位原文。
- **人类拥有最终控制权 | Human ownership**：Agent 可以提出修改建议，但永远不会自动写入 `MEMORY.md`。
- **懒模式候选收集 | Lazy candidate capture**：默认只收集用户消息中的潜在记忆，写入 `.dsh-memory-candidates.md` 供人工筛选。
- **有界存储 | Bounded memory**：默认限制注入内容为 6,000 个字符，候选最多 20 条，避免上下文和内存无限增长。
- **安全路径校验 | Workspace boundary**：记忆文件和候选文件必须位于当前工作区内，避免通过配置路径访问工作区之外的文件。

## 适合什么场景 | Use cases

- 需要让 Agent 持续遵守项目架构和编码约定的团队。
- 希望把产品决策、技术取舍和限制条件放进 Git 管理的个人开发者。
- 需要在多个会话之间保留稳定项目背景，但不接受黑盒自动记忆的用户。
- 重视可审计性、可复现性和人工审批边界的 Agent 工作流。

- Teams that need an agent to consistently follow project architecture and coding conventions.
- Developers who want product decisions and technical trade-offs versioned in Git.
- Users who need durable context across sessions without adopting opaque automatic memory.
- Agent workflows where auditability, reproducibility, and human approval matter.

## 为什么不用向量数据库 | Why not a vector database?

| 方式 | 记忆如何产生 | 主要问题 |
| --- | --- | --- |
| 自动记忆数据库 | Agent 自动提取并保存事实 | 过时或错误的事实可能变成不可见的权威 |
| 向量记忆 | 通过 embedding 召回相似文本 | 难以审查、调试和从 Git 复现 |
| 仅使用 `CLAUDE.md` | 完全依赖人工编写指令 | 缺少专门的查询工具和明确的记忆来源 |
| `dsh-project-memory` | 手写 Markdown、带标签注入、带行号查询 | 需要人工批准真正的记忆修改，这是设计目标 |

这不是一个黑盒记忆仓库，而是一个更接近版本化项目笔记本的工具。

This is intentionally closer to a versioned project notebook than to a black-box memory warehouse.

## Lazy mode

Lazy mode is enabled by default. At the end of a turn, it captures new messages whose source is the user and writes at most 20 short proposals to `.dsh-memory-candidates.md` in the current workspace.

它不会捕获插件生成的运行时上下文，也不会捕获模型输出，更不会修改 `MEMORY.md`。请人工审核候选内容，只把真正长期有效的事实移动到 `MEMORY.md`，然后像提交其他项目文件一样提交它。

It excludes plugin-generated runtime context and model output, and it never edits `MEMORY.md`. Review the candidates manually, move only durable facts into `MEMORY.md`, and commit that file like any other project change.

## 工作流程 | How it works

```text
启动会话
  -> 定位当前工作区
  -> 读取工作区内的 MEMORY.md
  -> 将内容作为带来源标记的项目上下文注入

Agent 查询项目事实
  -> 调用 project_memory(query)
  -> 按关键词匹配记忆内容
  -> 返回相关文本、文件路径和行号

一轮对话结束
  -> 只扫描新的用户消息
  -> 生成有限数量的记忆候选
  -> 写入 .dsh-memory-candidates.md
  -> 人工审核后再更新 MEMORY.md
```

## 安装 | Install locally

```sh
dsh plugin --profile web add /absolute/path/to/dsh-project-memory
```

在工作区根目录创建 `MEMORY.md`：

Create `MEMORY.md` at the workspace root:

```md
# Project Memory

- 产品：移动优先的任务管理器。
- 技术栈：React、TypeScript、SQLite。
- 决策：保持离线能力；未经批准不要加入云端依赖。

- Product: mobile-first task manager.
- Stack: React, TypeScript, SQLite.
- Decision: preserve offline support; do not add a cloud dependency without approval.
```

重启 `dsh web`，选择该工作区并开始会话。插件会自动加载项目记忆；需要查询具体内容时，Agent 可以使用 `project_memory` 工具。

Restart `dsh web`, select the workspace, and start a session. The plugin loads project memory automatically, and the agent can use `project_memory` when it needs to look up a specific fact.

## 设计边界 | Design boundaries

- `MEMORY.md` 是唯一的长期记忆事实来源。
- 插件不会让模型直接写入 `MEMORY.md`。
- 候选文件只是待审核内容，不等同于项目事实。
- 记忆默认按工作区隔离，不跨项目共享。
- 注入内容和候选内容都有大小上限。
- 文件路径会被限制在当前工作区内。

- `MEMORY.md` is the only source of truth for durable memory.
- The plugin never lets the model write directly to `MEMORY.md`.
- The candidate file contains unreviewed suggestions, not established project facts.
- Memory is isolated per workspace by default.
- Both injected memory and candidates are bounded.
- File paths are restricted to the current workspace.

## 开发 | Development

```sh
npm test
```

## 协议 | License

[MIT](./LICENSE)
