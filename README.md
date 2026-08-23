# dsh-project-memory

[![npm version](https://img.shields.io/npm/v/dsh-project-memory.svg?color=blue)](https://www.npmjs.com/package/dsh-project-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DSH Compatibility](https://img.shields.io/badge/DSH-%3E%3D0.1.0--rc.6-4B32C3.svg)](https://github.com/deepseek-ai)

让 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai) 记住项目背景与技术决策，但不让模型成为记忆的绝对所有者。

---

## 设计哲学

在传统的 AI Agent 记忆方案中，模型往往拥有直接写入甚至静默覆盖记忆库的权限，这极易导致**记忆幻觉、错误扩散以及版本不可回溯**。

`dsh-project-memory` 坚持以下核心原则：

1. **人类掌控（Human-Owned）**：长效记忆文件 `MEMORY.md` 是团队唯一的确定性事实来源。Agent **拥有只读检索权**，但**绝对禁止直接静默篡改**长期记忆。
2. **随代码版本化（Repository-Scoped）**：记忆应当与代码库放在一起，通过 Git 提交、合并与审查，具备完整的版本历史。
3. **显式来源标记（Labeled Context）**：向模型注入项目记忆时带有明确的元数据标记（路径、修改时间、行号引用），消除上下文歧义。
4. **提案式更新（Proposal Workflow）**：模型在会话中发现新的架构约定或技术事实时，仅能通过提出“修改建议（Proposals）”或写入暂存区，由开发者最终审阅并提交。

---

## 系统工作流

```
┌────────────────────────────────────────────────────────────┐
│                    Workspace Directory                     │
│  ┌──────────────┐     Git Commit     ┌──────────────────┐  │
│  │  MEMORY.md   │ ◄───────────────── │  Human Developer │  │
│  └──────┬───────┘                    └────────▲─────────┘  │
└─────────┼─────────────────────────────────────┼────────────┘
          │ Read-Only Context Injection         │ Review
          ▼                                     │ Proposals
┌───────────────────────┐              ┌────────┴─────────┐
│     Agent Prompt      │ ───────────► │ Candidate Output │
│ (Labeled System Init) │              │  (.candidates)   │
└───────────────────────┘              └──────────────────┘
```

---

## 核心功能

- **自动化上下文注入**：会话初始化时，自动读取工作区根目录下的 `MEMORY.md` 并以标准化 Markdown 格式注入系统上下文。
- **只读检索工具（`project_memory`）**：为 Agent 提供基于关键词加权评分的高效只读检索工具，支持带行号引用溯源。
- **长文本智能截断**：可配置单次注入最大字符阈值（`maxChars`），保障 Agent 上下文窗口健康。
- **候选记忆暂存**：支持将 Agent 提出的技术建议沉淀到 `.dsh-memory-candidates.md` 暂存区，供开发者后续审查吸收。

---

## 安装与挂载

### 方式 A：通过 DSH Plugin CLI 安装（推荐）

```bash
dsh plugin --profile web add dsh-project-memory
```

### 方式 B：手动通过 `cordis.patch.yml` 挂载

在你的 profile 配置文件（如 `cordis.patch.yml`）中添加：

```yaml
- insert:
    - id: project-memory
      name: 'dsh-project-memory'
      config:
        fileName: 'MEMORY.md'
        maxChars: 6000
        lazyMode: true
```

---

## 配置参数详解

| 参数名 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `fileName` | `string` | `MEMORY.md` | 工作区根目录下的主要记忆文件名 |
| `candidateFileName`| `string` | `.dsh-memory-candidates.md` | 候选记忆暂存文件名 |
| `maxChars` | `number` | `6000` | 注入系统上下文时的最大字符截断限制 |
| `maxMatches` | `number` | `6` | 工具检索时返回的最大匹配段落数 |
| `lazyMode` | `boolean`| `true` | 是否启用按需懒加载策略 |

---

## 项目记忆书写规范（`MEMORY.md` 推荐结构）

建议在你的项目根目录下创建 `MEMORY.md`，推荐结构如下：

```markdown
# Project Memory

## 架构与技术栈
- 前端：React 18 + TypeScript + Tailwind CSS
- 后端：Node.js 22 + Cordis 架构

## 关键技术决策
- 所有针对 API 中转站的请求需统一走 failover 调度池。
- 拒绝在主分支直接写入未验证的实验性代码。

## 常用命令
- 本地调试：`pnpm run dev`
- 运行测试：`pnpm test`
```

---

## 开源协议

本项目基于 [MIT 协议](LICENSE) 开源。
