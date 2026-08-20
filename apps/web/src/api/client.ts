const inflightGetRequests = new Map<string, Promise<unknown>>();

export function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() ?? 'GET';
  if (method !== 'GET') return executeRequest<T>(path, init);

  const existing = inflightGetRequests.get(path);
  if (existing) return existing as Promise<T>;

  const pending = executeRequest<T>(path, init);
  inflightGetRequests.set(path, pending);
  void pending
    .finally(() => {
      if (inflightGetRequests.get(path) === pending) inflightGetRequests.delete(path);
    })
    .catch(() => undefined);
  return pending;
}

async function executeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    let message = raw;
    try {
      const parsed = JSON.parse(raw) as { message?: string | string[] };
      message = Array.isArray(parsed.message) ? parsed.message.join('；') : parsed.message ?? raw;
    } catch {
      // 保留非 JSON 错误正文。
    }
    throw new Error(message || `请求失败 (HTTP ${response.status})`);
  }
  return (await response.json()) as T;
}
