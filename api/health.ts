import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const configured = Boolean(url && token);

  return res.status(200).json({
    ok: true,
    redis: configured ? 'ready' : 'missing',
    hint: configured
      ? 'Upstash Redis 已配置，可用同步码保存/拉取'
      : '请在 Vercel → Settings → Environment Variables 添加 UPSTASH_REDIS_REST_URL 与 UPSTASH_REDIS_REST_TOKEN，然后 Redeploy',
  });
}
