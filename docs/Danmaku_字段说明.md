# B站弹幕数据字段说明

记录 `seg.so` 分片弹幕接口（protobuf 解码）产出的弹幕数据结构和各字段语义。

数据来源：`GET https://api.bilibili.com/x/v2/dm/wbi/web/seg.so`（WBI 签名）或其 legacy 端点 `GET https://api.bilibili.com/x/v2/dm/web/seg.so`。返回二进制 protobuf（`DmSegMobileReply`），解码后为标准化 JSON。

## 1. 顶层结构

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
  "danmaku": [
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
  ]
}
```

## 2. `meta` 字段

| 字段 | 示例值 | 含义 |
|---|---|---|
| `bvid` | `BV1j4411W7F7` | 视频 BVID |
| `aid` | `53851218` | AV 号 |
| `cid` | `94198756` | 当前分 P 的 cid（弹幕挂在 cid 下） |
| `segment_index` | `1` | 分片索引，从 1 开始（B 站按约 6 分钟一个分片） |
| `endpoint` | `legacy` | 实际拉取所用端点：`wbi` / `legacy` |
| `count` | `630` | 本分片弹幕条数 |

## 3. `danmaku` 单条字段

| 字段 | 类型 | 示例值 | 含义 |
|---|---|---|---|
| `id` | string | `"16731301560188930"` | 弹幕唯一 ID（int64，用字符串避免精度丢失） |
| `progress` | number | `56973` | 弹幕在视频内出现的时间，单位毫秒（约 56.97s 处） |
| `mode` | number | `1` | 弹幕模式，见下方枚举 |
| `fontsize` | number | `25` | 字号档位 |
| `color` | number | `16777215` | 颜色，十进制 RGB |
| `content` | string | `"厉害，确实厉害"` | 弹幕文本 |
| `ctime` | string | `"1559054600"` | 发送时间，Unix 秒（字符串，约 2019-05-28） |
| `weight` | number | `9` | 权重，用于弹幕排序/智能屏蔽 |
| `pool` | number | `0` | 弹幕池类型 |
| `attr` | number | `0` | 弹幕属性位标志（bitmask） |

### 3.1 `mode`（弹幕模式）

| 值 | 含义 |
|---|---|
| `1/2/3` | 滚动弹幕 |
| `4` | 底部固定弹幕 |
| `5` | 顶部固定弹幕 |
| `6` | 逆向滚动 |
| `7` | 高级（精准定位）弹幕 |
| `8` | 代码弹幕 |
| `9` | BAS 弹幕 |

### 3.2 `color` 换算

十进制 RGB，转十六进制即 CSS 颜色：`'#' + color.toString(16).padStart(6, '0')`。

| 十进制 | 十六进制 | 颜色 |
|---|---|---|
| `16777215` | `#FFFFFF` | 白 |
| `16707842` | `#FEF102` | 黄 |
| `15138834` | `#E70012` | 红 |
| `8700107` | `#84C0CB` | 浅蓝 |
| `16711680` | `#FF0000` | 纯红 |

### 3.3 `fontsize` 档位

B 站标准字号：`12 / 16 / 18 / 25 / 36 / 45 / 64`（25 为中等）。

### 3.4 `pool`（弹幕池）

| 值 | 含义 |
|---|---|
| `0` | 普通弹幕 |
| `1` | 字幕弹幕 |
| `2` | 特殊弹幕 |

### 3.5 `attr`（位标志）

bitmask，不同 bit 代表不同属性，B 站未完整公开。常见值 `0 / 1 / 4`，`0` 为无特殊标记，非零值需结合弹幕协议进一步确认。

## 4. 与原始 protobuf 的差异

原始 `DanmakuElem` 还包含 3 个字段，后端 `toDanmaku` 精简输出时丢弃：

| 丢弃字段 | proto 编号 | 含义 |
|---|---|---|
| `midHash` | 6 | 发送者用户 mid 的哈希（可作匿名用户指纹） |
| `action` | 10 | 弹幕操作信息（BAS/交互弹幕用） |
| `idStr` | 12 | `id` 的字符串形式 |

如需用户维度的去重/聚合（如统计同一批观众、追踪重复刷屏），需在解码处保留 `midHash`。

## 5. 代码位置

- 拉取与解码：`apps/server/src/services/bilibili.service.ts`（`DM_PROTO`、`toDanmaku`）
- 数据契约：`apps/server/src/types.ts` 与 `apps/web/src/types.ts`（各存一份，保持一致）
- WBI 签名：`apps/server/src/utils/wbi.ts`
