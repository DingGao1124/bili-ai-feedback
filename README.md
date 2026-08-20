# B站观众反馈 AI 分析平台

面向成长型和成熟型 UP 主的视频复盘工具。输入视频链接或 BV 号后，系统会先展示真实弹幕和评论，再流式运行 AI 分析，最终生成可追溯的创作建议。

## 核心能力

- 全量弹幕密度时间轴与原始弹幕列表
- 热门 2000 条 + 最新 500 条评论，按 ID 去重
- AI 话题摘要、情绪倾向与 Top 5 核心反馈
- 高价值评论筛选与透明评分信号
- 下一期内容、结构、选题、互动和表达建议
- 每条 AI 洞察关联真实评论或弹幕证据
- 流式展示分析步骤、思考内容和工具调用

## 技术栈

- bun workspaces，Node.js ≥ 22
- `apps/server`：NestJS 11、LangChain `createAgent`、ChatDeepSeek、Zod、protobufjs
- `apps/web`：React 19、Vite、React Router、Zustand、Tailwind CSS v4、shadcn/ui、Recharts

## 安装与运行

环境要求：Node.js ≥ 22、bun ≥ 1.0。

```bash
curl -fsSL https://bun.sh/install | bash
bun install
cp apps/server/.env.example apps/server/.env
bun run dev
```

打开 <http://localhost:5173>。`bun run dev` 会先启动后端、等待 3001 就绪后再启动前端，避免 Vite 抢跑产生代理错误。也可以用 `bun run dev:server` / `bun run dev:web` 分别启动。

### 环境变量

| 变量 | 说明 |
|---|---|
| `PORT` | 后端端口，默认 3001 |
| `BILI_COOKIE` | 可选；提高弹幕/评论完整度与风控通过率 |
| `DEEPSEEK_API_KEY` | ChatDeepSeek 密钥；未配置时原始数据可用，AI 报告失败并提示重试 |
| `DEEPSEEK_MODEL` | 可选；DeepSeek 模型名，默认 `deepseek-v4-flash` |
| `DEEPSEEK_REASONING_EFFORT` | 可选；推理强度 `low`/`medium`/`high`，默认 `medium` |
| `LANGSMITH_TRACING` / `LANGSMITH_API_KEY` / `LANGSMITH_PROJECT` | 可选调用链追踪 |

## 页面

- `/`：输入视频链接或 BV 号。
- `/workspace/:jobId`：原始数据、加载进度、思考流程和工具调用。
- `/report/:jobId`：AI 话题、情感、Top 5、高价值反馈和创作建议。

## 校验

```bash
bun run test
bun run typecheck
bun run build
```

## 文档

| 文档 | 说明 |
|---|---|
| `docs/项目架构.md` | 当前模块、数据流、任务生命周期和 AI 边界 |
| `docs/AI分析任务接口.md` | 异步任务、SSE、原始数据、报告和重试接口 |
| `docs/弹幕评论拉取接口.md` | B站元信息、弹幕时间窗和评论游标接口 |
| `docs/Danmaku_字段说明.md` | 弹幕字段语义 |
| `docs/评论字段说明.md` | 评论字段语义 |
| `docs/Cookie_说明.md` | B站 Cookie 字段与有效期 |
| `docs/开发记录.md` | 功能性变更记录 |

涉及 API、数据契约、环境变量或抓取流程的修改必须同步更新 `docs/` 和 `docs/开发记录.md`。
