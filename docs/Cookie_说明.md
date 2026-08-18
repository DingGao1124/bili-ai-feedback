# B站登录 Cookie 说明

后端通过 `BILI_COOKIE` 环境变量携带 B 站登录态 cookie，用于抓取弹幕/评论时提高完整度与风控通过率。不配置也能抓部分公开数据（弹幕/评论完整度和通过率会下降）。

## 字段与有效期

| 字段 | 过期情况 | 说明 |
|---|---|---|
| `SESSDATA` | **约半年**（本仓库实测：`2027-02-14 11:46:35`） | 主登录态，绑定账号 |
| `bili_jct` | 不单独过期 | CSRF token，跟 SESSDATA 走；SESSDATA 失效它也没用 |
| `buvid3` | 基本不过期 | 设备指纹，浏览器不清缓存就在 |
| `bili_ticket` | **约 3 天**（本仓库实测：`2026-08-21 12:45:03`）⚠️ | B 站新的短期 token，越来越多接口会校验 |

> 实测时间点：2026-08-18。SESSDATA 取 cookie 中段逗号分隔的时间戳（`<前缀>,<过期时间戳>,...` → 中间段即过期 Unix 秒）；bili_ticket 为 JWT，解码 payload 的 `exp` 字段。

## 有效期实测

用 `apps/server/.env` 里的整份 cookie 请求 `GET https://api.bilibili.com/x/web-interface/nav`：

```
code: 0
isLogin: True
uname: <账号昵称>
level: 6
```

结论：当前 cookie 为有效登录态（LV6），可直接使用。

## 注意事项

- 后端目前把**整份 cookie 静态**写死在 `.env`，`bili_ticket` 不会自动刷新。它约 3 天过期后，部分接口可能开始报风控/失败。
- 过期后两个方案：
  1. 从浏览器重新复制整份 cookie 替换 `.env`（最快）；
  2. 给后端加启动时自动刷新 `bili_ticket` 的逻辑（用 nav / refresh 接口换新 token，写回内存，无需手抄）。

## 更新记录

- 2026-08-18 首次记录并实测。
