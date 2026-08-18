import { Injectable, Logger } from '@nestjs/common';

/**
 * 极简 LLM 客户端：走 OpenAI 兼容的 /chat/completions。
 * 未配置 LLM_* 环境变量时 enabled=false，分析服务据此回退到本地启发式。
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly baseUrl = (process.env.LLM_BASE_URL ?? '').replace(/\/$/, '');
  private readonly apiKey = process.env.LLM_API_KEY ?? '';
  private readonly model = process.env.LLM_MODEL ?? 'gpt-4o-mini';

  get enabled(): boolean {
    return this.baseUrl !== '' && this.apiKey !== '';
  }

  /** 发一条 system+user 消息，要求返回 JSON，解析后返回对象。失败返回 null。 */
  async completeJson<T>(system: string, user: string): Promise<T | null> {
    if (!this.enabled) return null;
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) {
        this.logger.warn(`LLM HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;
      return JSON.parse(content) as T;
    } catch (err) {
      this.logger.warn(`LLM 调用失败: ${String(err)}`);
      return null;
    }
  }
}
