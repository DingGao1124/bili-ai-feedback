# B站评论弹幕 AI 分析工具

面向成长/成熟型 UP 主的观众反馈分析平台。输入视频链接或 BV 号，自动抓取评论与弹幕，用 AI 生成：

- 一键话题摘要（高频热词、情感分布、Top5 高价值反馈）
- 弹幕时间轴情绪曲线（定位观众反应强烈的片段）
- 按用户等级/互动量识别高价值评论并优先展示

## 技术栈

- 包管理 / 运行时：**bun**（monorepo workspaces）
- 前端 `apps/web`：Vite + React 19 + React Compiler + TypeScript + Tailwind CSS v4 + shadcn/ui + Recharts
- 后端 `apps/server`：NestJS（WBI 签名 + protobuf 弹幕解码 + 评论抓取 + LLM 分析）
- 数据契约：`apps/server/src/types.ts` 与 `apps/web/src/types.ts` 各存一份，保持一致

## 目录结构

```
bili-ai-feedback/
├── apps/
│   ├── server/          NestJS 后端
│   │   └── src/
│   │       ├── controllers/   API 路由（analysis / bilibili）
│   │       ├── services/      业务逻辑（bilibili / analysis / llm）
│   │       ├── modules/       NestJS 模块装配
│   │       ├── utils/         WBI 签名、本地启发式
│   │       └── types.ts       数据契约（与 web 各存一份）
│   └── web/             Vite + React 19 + Tailwind v4 + shadcn
│       └── src/
│           ├── components/ui/       shadcn 基础组件
│           ├── components/result/   结果可视化组件
│           ├── types.ts             数据契约（与 server 各存一份）
│           └── App.tsx              工作台页面
└── docs/                架构 / 接口 / 字段 / Cookie / 开发记录
```

完整架构与设计决策见 `docs/项目架构.md`。

## 安装与运行

### 1. 环境要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| **bun** | ≥ 1.0（建议 1.3+） | 包管理 + 运行时，monorepo 依赖它，**必须先装** |
| Node.js | ≥ 22 | 后端 NestJS 与前端 Vite 基于 Node 运行（由 bun 启动） |

### 2. 安装 bun

bun 是这套项目唯一缺一不可的依赖。若已安装可跳过（用 `bun --version` 验证）。

**macOS / Linux（官方脚本，推荐）：**

```bash
curl -fsSL https://bun.sh/install | bash
# 安装后需让 shell 生效（新开终端即可）
bun --version
```

**macOS（Homebrew）：**

```bash
brew install oven-sh/bun/bun
```

**Linux / WSL（apt 或 npm 方式）：**

```bash
# 方式一：npm 全局安装（需先有 Node ≥ 18）
npm install -g bun

# 方式二：apt（仅部分发行版可用）
# 见 https://bun.sh/docs/installation
```

**Windows（PowerShell）：**

```powershell
# 官方脚本（建议用 WSL / Git Bash 体验更好）
powershell -c "irm bun.sh/install.ps1 | iex"

# 或 npm 全局安装
npm install -g bun
```

安装完成后验证：

```bash
bun --version   # 输出类似 1.3.x 即成功
```

> 提示：bun 依赖 Node 生态，但自身是独立运行时。`bun install` / `bun run` 由 bun 全权接管，无需手动配 npm。

### 3. 安装项目依赖

```bash
# 在项目根目录（bili-ai-feedback/）执行
bun install
```

这一步会装好前后端所有依赖（monorepo workspaces），并**自动安装 pre-commit 钩子**（详见下文「提交前校验」）。

### 4. 配置环境变量（可选，不配也能跑）

```bash
cp apps/server/.env.example apps/server/.env
```

- 不配 `BILI_COOKIE`：仍可抓公开数据（实测热门视频可正常分析）。
- 不配 `LLM_*`：分析自动回退本地启发式摘要，demo 端到端可跑。
- 完整配置项见下方「环境变量」表。

### 5. 启动

```bash
# 同时启动前后端（前端 :5173，后端 :3001，/api 已配代理）
bun run dev

# 或分开启动
bun run dev:server   # 只起后端 :3001
bun run dev:web      # 只起前端 :5173
```

打开 http://localhost:5173 ，输入 BV 号（如 `BV1j4411W7F7`）即可分析。

## 环境变量（apps/server/.env）

| 变量 | 说明 |
|---|---|
| `PORT` | 后端端口，默认 3001 |
| `BILI_COOKIE` | B 站登录态 cookie。不配也能抓公开数据，配了完整度和风控通过率更高 |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | OpenAI 兼容网关。**留空时分析自动回退到本地启发式摘要**，保证 demo 端到端可跑 |

## AI 与本地启发式

摘要和 Top5 高价值反馈优先调用 LLM；未配置 `LLM_*` 时回退到本地启发式（关键词/情感词表 + 用户等级加权），返回结果中 `aiGenerated` 字段标识来源。热词、情感分布、时间轴曲线始终由本地确定性算法计算。

## 校验

```bash
bun run typecheck   # 前后端类型检查
bun run build       # 前后端生产构建
```

## 提交前校验（pre-commit hook）

`.githooks/pre-commit` 在每次 `git commit` 时自动拦截：

1. `.env` / `.env.local` 等敏感文件被暂存（`.env.example` 模板放行）
2. 暂存 diff 里出现真实凭据（SESSDATA / bili_jct / bili_ticket / API key / 密码等）
3. 暂存 diff 里存在 merge 冲突标记
4. 前后端 typecheck 未通过（bun 缺失时跳过并提示）

凭据规则集中在 `.githooks/secret-patterns`，需要新增时直接追加。

钩子在 `bun install` 时**自动安装**（root `postinstall` 设置 `core.hooksPath`），克隆后只需：

```bash
bun install
bun run dev
```

> 已实测：`POST /api/analysis {"input":"BV1j4411W7F7"}` 可无 cookie 抓取真实视频的播放量、弹幕、评论并返回完整分析结果。

## 文档

| 文档 | 说明 |
|---|---|
| `docs/项目架构.md` | 架构、目录结构、设计决策、运行方式 |
| `docs/弹幕评论拉取接口.md` | 后端 REST 接口（meta / 弹幕分页 / 评论分页）与 ps·pe 时间窗、评论游标翻页语义 |
| `docs/Danmaku_字段说明.md` | 弹幕数据字段语义说明（meta/danmaku 各字段、mode/color/pool/attr 枚举） |
| `docs/评论字段说明.md` | 评论数据字段语义说明（Comment 各字段、游标翻页） |
| `docs/Cookie_说明.md` | B 站登录 cookie 字段与有效期（SESSDATA / bili_ticket 等） |
| `docs/开发记录.md` | 关键功能性变更记录（持续追加） |
| `docs/Danmaku_API.md` | ⚠️ 已废弃：早期 CLI 文档（CLI 已删，逻辑迁入后端），仅作历史参考 |

**给后续工作的 AI 智能体：**

- 架构、接口契约、字段语义等说明统一沉淀在 `docs/` 目录。
- 修改涉及对外契约（API 入参出参、弹幕/评论字段、解码流程、数据契约 `types.ts`）的代码时，**必须同步更新 `docs/` 下对应文档**。
- 新增能力时补充或新建文档，并更新本 README 的「文档」索引表格。
