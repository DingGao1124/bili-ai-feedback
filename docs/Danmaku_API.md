# Bilibili Danmaku Segment Fetcher API

> ⚠️ **已废弃**：本文档描述的是早期 TypeScript CLI（`src/index.ts`），该 CLI 已删除，
> WBI 签名 + protobuf 弹幕解码逻辑已迁移到后端 `apps/server/src/services/bilibili.service.ts`。
> 当前 REST 接口见 `docs/弹幕评论拉取接口.md`，弹幕字段语义见 `docs/Danmaku_字段说明.md`。
> 保留本文仅作 WBI/protobuf 管道的历史参考。

## 0. Scope

TypeScript CLI。目标：拉取并解析 Bilibili 分片弹幕（`seg.so`，protobuf）。

---

## 1. Minimal Brief

- 输入：`bvid` 或 `aid + cid`
- 输出：标准化弹幕 JSON（可选 HTML 预览）
- 拉取策略：
  - `auto`：WBI 优先，失败降级 legacy（显式警告）
  - `wbi`：仅 WBI（失败即退出）
  - `legacy`：仅 legacy

---

## 2. Runtime Commands

```bash
npm run fetch         # auto
npm run fetch:wbi     # force wbi
npm run fetch:legacy  # force legacy
```

自定义参数：

```bash
npm run start -- \
  --bvid BV1j4411W7F7 \
  --segment 1 \
  --fetch-mode auto \
  --out out/danmaku.json \
  --html out/danmaku.html
```

---

## 3. CLI Contract

### 3.1 Parameters

| Name | Type | Required | Default | Description |
|---|---|---:|---:|---|
| `--bvid` | `string` | conditional | - | 视频 BVID。与 `aid+cid` 二选一 |
| `--aid` | `number` | conditional | - | AV ID。与 `cid` 配套使用 |
| `--cid` | `number` | conditional | - | 分 P CID。`oid=cid` |
| `--segment` | `number` | no | `1` | 分片索引，从 `1` 开始 |
| `--fetch-mode` | `auto \| wbi \| legacy` | no | `auto` | 拉取模式 |
| `--ps` | `number` | no | `0` | WBI 参数，起始毫秒 |
| `--pe` | `number` | no | `120000` | WBI 参数，结束毫秒 |
| `--pull_mode` | `number` | no | `1` | WBI 参数 |
| `--web_location` | `number` | no | `1315873` | WBI 参数 |
| `--out` | `string` | no | stdout | 输出 JSON 文件 |
| `--html` | `string` | no | - | 输出渲染预览 HTML |
| `--cookie` | `string` | no | - | 登录态（用于受限场景） |

### 3.2 Exit Behavior

- 成功：`exit 0`
- 失败：`exit 1`
  - 例：`fetch-mode=wbi` 且签名或请求失败

---

## 4. Upstream Endpoints

### 4.1 WBI Segment API

`GET https://api.bilibili.com/x/v2/dm/wbi/web/seg.so`

关键 query：

- `type=1`
- `oid=<cid>`
- `pid=<aid>`
- `segment_index=<n>`
- `wts=<unix sec>`
- `w_rid=<md5(sortedQuery+mixinKey)>`

### 4.2 Legacy Segment API

`GET https://api.bilibili.com/x/v2/dm/web/seg.so?type=1&oid=<cid>&segment_index=<n>`

### 4.3 WBI Key Source

`GET https://api.bilibili.com/x/web-interface/nav`

从 `wbi_img.img_url` 与 `wbi_img.sub_url` 计算 `mixin_key`。

---

## 5. Decode Pipeline

1. 请求 `seg.so`，获得二进制 payload  
2. 使用内置 `DM_PROTO` 进行 protobuf decode  
3. 映射为标准对象：

```json
{
  "id": "16731301560188930",
  "progress": 56973,
  "mode": 1,
  "fontsize": 25,
  "color": 16777215,
  "content": "厉害，确实厉害",
  "ctime": "1559054600",
  "weight": 9,
  "pool": 0,
  "attr": 0
}
```

---

## 6. Response Schema

```json
{
  "meta": {
    "bvid": "BV1j4411W7F7",
    "aid": 53851218,
    "cid": 94198756,
    "segment_index": 1,
    "endpoint": "legacy",
    "count": 630
  },
  "danmaku": []
}
```

`meta.endpoint` 取值：`wbi | legacy`。

---

## 7. Render Contract (HTML Export)

- 时间轴：按 `progress(ms)` 排序并调度
- 模式映射：
  - `mode=1/2/3`：滚动轨道
  - `mode=4`：底部固定
  - `mode=5`：顶部固定
- 颜色：`int -> #RRGGBB`

---

## 8. Error Policy

- 不吞错，不静默降级
- `auto` 模式：WBI 失败会 `warn` 并标记 `endpoint=legacy`
- `wbi` 模式：禁止 fallback，失败直接退出

---

## 9. Security Note

- `SESSDATA`、`bili_jct` 等 Cookie 属于高敏感凭据。
- 不记录到仓库，不打印到日志，不在聊天中明文传播。
