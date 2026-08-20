# AI 分析任务接口

长耗时分析使用异步任务和 SSE，不再使用同步 `POST /api/analysis`。

## 创建与状态

### `POST /api/analysis/jobs`

请求：

```json
{ "input": "BV1j4411W7F7" }
```

返回 HTTP 202 与 `AnalysisJobView`。前端使用返回的 `id` 进入 `/workspace/:jobId`。

### `GET /api/analysis/jobs/:jobId`

返回任务状态、阶段文案、进度、视频信息、覆盖率、原始统计是否可用以及 `resultReady`。

状态顺序：`queued → fetching → preprocessing → semantic_mapping → agent_running → validating → completed`。

失败状态为 `fetch_failed` 或 `ai_failed`。只有 `ai_failed` 且原始数据已准备完成时可直接重试 AI。

## 事件流

### `GET /api/analysis/jobs/:jobId/events?after=<seq>`

响应类型为 `text/event-stream`。事件包含 `jobId`、递增 `seq`、`timestamp`、`type` 和 `data`。

事件类型：`status`、`progress`、`meta_ready`、`message_delta`、`reasoning_delta`、`tool_call`、`tool_result`、`section_saved`、`completed`、`failed`。

服务端支持 `Last-Event-ID` 和 `after`，断线后补发序号更大的事件。每 15 秒发送 keep-alive；完成或失败后关闭连接。

### `GET /api/analysis/jobs/:jobId/events/history?after=<seq>`

以 JSON 数组返回历史事件。前端首次进入或刷新任务页时先批量恢复 Markdown 思考、工具调用和进度，再从最后一个 `seq` 接续 SSE，避免大量历史事件逐条渲染造成卡顿。

## 原始数据

- `GET /api/analysis/jobs/:jobId/raw/danmaku?offset=0&limit=50&query=&start=&end=`
- `GET /api/analysis/jobs/:jobId/raw/comments?offset=0&limit=30&query=&level=`

两者返回 `{ items, total }`，数据来自该任务已经抓取的内存语料，不会再次请求 B站。

## 报告与重试

- `GET /api/analysis/jobs/:jobId/report`：完成后返回 `AnalysisReport`；未完成返回 409。
- `POST /api/analysis/jobs/:jobId/retry`：复用已有原始数据重新运行 AI，返回 HTTP 202。

报告包含视频信息、摘要、话题及精确提及次数、样本情感比例、弹幕时间轴、Top 5、高价值评论、下一期建议、真实证据引用和覆盖率。报告入库前会按 ID 回查评论/弹幕并使用真实原文覆盖模型引用文本；不存在的证据会被丢弃。

前端会合并同一时刻的重复 GET 请求。直接打开已经过期的报告链接时只请求报告接口一次，并显示返回首页重新分析的入口。

## 生命周期

- 内存任务 TTL：60 分钟。
- 最大任务数：20。
- 同时运行任务：2，其余排队。
- 服务重启后任务和报告失效。
