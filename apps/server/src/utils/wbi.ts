import { createHash } from 'node:crypto';

// WBI 签名：B 站 web 端接口的防重放签名。逻辑迁移自根目录 CLI (src/index.ts)。

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
];

export function getMixinKey(orig: string): string {
  return MIXIN_KEY_ENC_TAB.map((i) => orig[i])
    .join('')
    .slice(0, 32);
}

function sanitizeWbiValue(v: string): string {
  return v.replace(/[!'()*]/g, '');
}

/** 用 mixinKey 对参数排序、拼接、md5，产出 w_rid，并附上 wts。 */
export function buildSignedQuery(
  params: Record<string, string | number>,
  mixinKey: string,
): string {
  const withWts = { ...params, wts: Math.floor(Date.now() / 1000) };
  const query = Object.keys(withWts)
    .sort()
    .map((k) => {
      const value = sanitizeWbiValue(String(withWts[k]));
      return `${encodeURIComponent(k)}=${encodeURIComponent(value)}`;
    })
    .join('&');
  const wRid = createHash('md5')
    .update(query + mixinKey)
    .digest('hex');
  return `${query}&w_rid=${wRid}`;
}
