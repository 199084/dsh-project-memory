# 使用手册

本手册覆盖安装、配置、书写规范与故障排查。想先了解设计动机，请看 [设计说明](design.md)。

## 1. 安装

### 方式 A：DSH Plugin CLI（推荐）

```bash
dsh plugin --profile web add dsh-project-memory
```

`dsh plugin` 会把后续参数透传给 pnpm，因此可以使用 pnpm 的任意开关。把 `web` 换成你实际使用的 profile（例如 `tui`）即可。

### 方式 B：手工挂载

在 profile 的补丁文件（如 `cordis.patch.yml`）中加入：

```yaml
- insert:
    - id: project-memory
      name: dsh-project-memory
      config:
        fileName: MEMORY.md
        maxChars: 6000
        lazyMode: true
```

也可以完全绕过 profile，用命令行叠加一层补丁：

```bash
dsh web --patch ./my-memory.yml
```

### 验证安装

```bash
dsh --profile web --dump-config | grep -A3 project-memory
```

## 2. 配置详解

| 参数 | 类型 | 取值范围 | 默认值 | 建议 |
| --- | --- | --- | --- | --- |
| `fileName` | `string` | — | `MEMORY.md` | 保持默认即可；改名前先确认没和别的工具撞名 |
| `candidateFileName` | `string` | — | `.dsh-memory-candidates.md` | 建议以 `.` 开头并写进 `.gitignore`，避免误提交候选 |
| `maxChars` | `number` | 500 – 20000 | `6000` | 约等于 3000 至 4000 个汉字；记忆超过它就该做减法了 |
| `maxMatches` | `number` | 1 – 20 | `6` | 调大提升召回但稀释信息密度，8 以上收益通常很小 |
| `lazyMode` | `boolean` | — | `true` | 只想读不想留痕时设为 `false`，插件即变成纯只读 |
| `maxCandidates` | `number` | 1 – 100 | `20` | 候选堆积说明审阅节奏跟不上，先清理再调大 |
| `maxCandidateChars` | `number` | 1000 – 20000 | `6000` | 与上一条共同构成写入上限，触顶后静默跳过 |

写入上限的判断逻辑是：候选文件的实际字符数加上本次待追加内容超过 `maxCandidateChars`，或已有条目数达到 `maxCandidates`，则本次**不写入**（不是写一部分）。

## 3. MEMORY.md 书写规范

### 推荐结构

```markdown
# Project Memory

## 架构与技术栈
- 前端：React 18 + TypeScript + Tailwind CSS
- 后端：Node.js 22 + Cordis 插件架构

## 关键技术决策
- 用 SQLite 而非 Postgres，因为需要完全离线运行。
- 所有发往 API 中转站的请求统一走 failover 调度池。

## 团队约定
- 提交信息使用中文 Conventional Commits。
- 每个 PR 至少一位 Reviewer，禁止自合。

## 禁忌与红线
- 不要引入云同步。
- 不要修改 `legacy/` 目录下的代码。

## 常用命令
- 本地调试：`pnpm run dev`
- 运行测试：`pnpm test`
```

### 该写与不该写

| 该写 | 不该写 |
| --- | --- |
| 技术选型与理由 | 一次性的调试过程 |
| 团队约定与红线 | 临时结论与未验证的猜测 |
| 高频命令、关键路径 | 代码里能直接读出来的事实 |
| 跨会话仍然成立的事实 | 只对某一次会话成立的上下文 |

### 体积控制

`MEMORY.md` 每次会话都会被整段注入。经验值：**控制在 200 行以内**，把细节下沉到链接的文档里，记忆文件只留结论与入口。

## 4. 日常流程

1. **会话中**：模型遇到可能的既有决策时调用 `project_memory`，得到带行号的摘录，回答时引用来源。
2. **会话结束**：`lazyMode` 把本轮用户消息沉淀为候选条目。
3. **人工审阅**：打开候选文件，把确认的部分手工并入 `MEMORY.md`，其余删除。
4. **提交**：`MEMORY.md` 的改动跟着代码一起走常规 Git 流程。

候选文件里的条目长这样：

```markdown
- [ ] 把 SQLite 换成 DuckDB，离线优先。
```

它是**用户原话**的截取（空白折叠、最长 500 字符），不是模型总结。审阅时可以整条采纳、改写后采纳，或者直接删掉。

## 5. `project_memory` 工具怎么用

工具签名：

```json
{
  "query": "要查的事实、决策、组件或任务"
}
```

因为匹配是词面子串，提问方式直接影响命中率：

| 好的查询 | 差的查询 |
| --- | --- |
| `离线存储 选型` | `之前说过什么` |
| `API 中转 failover` | `项目`（太泛，且命中过多行） |
| `提交信息 规范` | `为什么`（无有效词元，会返回全文） |

调用返回：

```text
Project memory (/path/to/project/MEMORY.md):
3: - 用 SQLite 而非 Postgres，因为需要完全离线运行。
12: - 所有发往 API 中转站的请求统一走 failover 调度池。
```

## 6. 故障排查

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| 模型完全看不到记忆 | 工作目录下没有 `MEMORY.md`；或文件名被改过 | 确认文件存在于会话 cwd 根目录，或检查 `fileName` 配置 |
| 只看到一部分记忆 | 超过 `maxChars` 被截断 | 注入文本末尾会带 `[Memory file truncated ...]` 提示；瘦身记忆或调大上限 |
| 检索总是返回全文 | 查询里没有长度大于 1 的词元 | 改用具体名词或英文术语提问 |
| 检索结果不相关 | 词面匹配命中不了同义词 | 查询词与记忆用词保持一致，或在记忆里补充同义写法 |
| 候选文件一直是空的 | `lazyMode` 被关；或本轮没有用户消息 | 检查配置与候选文件名是否被 `.gitignore` 干扰 |
| 候选不再增长 | 已达 `maxCandidates` 或 `maxCandidateChars` 上限（静默跳过） | 清理候选文件后恢复写入 |
| 报错 `MEMORY.md path must remain inside the workspace` | `fileName` 指向了工作区之外的路径 | 改回相对工作区的路径，这是有意的安全限制 |
| 安装时提示 peer 依赖版本不符 | `package.json` 中的 `peerDependencies` 指向旧版 `dsh-tools` | 与本机 DSH 版本对齐，或安装时放宽 pnpm 的 peer 校验 |

## 7. FAQ

**多个项目会互相污染吗？** 不会。隔离边界是会话工作目录，每个项目读自己的 `MEMORY.md`。

**记忆会跨会话累积吗？** 文件不自动变化，只有人写入才会变化。会话本身不积累记忆。

**能自动更新 `MEMORY.md` 吗？** 不能，这是核心设计。模型只提议，写入由人完成。

**关掉插件后候选文件要删吗？** 候选文件是普通 Markdown，留着无害；确认无用后直接删除即可。

**候选条目会被提交进仓库吗？** 默认不会——示例 `.gitignore` 里已包含 `.dsh-memory-candidates.md`。

## 8. 卸载

```bash
dsh plugin --profile web remove dsh-project-memory
```

删除 profile 补丁中的 `insert` 条目，并按需移除 `MEMORY.md`（注意它是项目资产，通常应当保留在仓库里）。
