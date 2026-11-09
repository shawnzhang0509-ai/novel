import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedisFromEnv } from './_redis';

const CODE_RE = /^[a-zA-Z0-9_-]{8,64}$/;

function syncCode(req: VercelRequest): string | null {
  const header = req.headers['x-sync-code'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  const fromQuery = typeof req.query.code === 'string' ? req.query.code : '';
  const code = (fromHeader || fromQuery || '').trim();
  if (!CODE_RE.test(code)) return null;
  return code;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-sync-code');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const redis = getRedisFromEnv();
  if (!redis) {
    return res.status(503).json({
      error:
        '云端未配置：novel 项目的 Production 环境变量里还没有 Redis。请到 Vercel → novel → Settings → Environment Variables 确认有 UPSTASH_REDIS_REST_URL / TOKEN（或 KV_REST_API_URL / TOKEN），勾选 Production，然后对 Production Redeploy。',
    });
  }

  const code = syncCode(req);
  if (!code) {
    return res.status(400).json({ error: '同步码无效（8–64 位字母数字）' });
  }

  const key = `grass-snake:v4:${code}`;

  try {
    if (req.method === 'GET') {
      const data = await redis.get(key);
      return res.status(200).json({ data: data ?? null });
    }

    if (req.method === 'PUT') {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: '缺少 JSON 正文' });
      }
      await redis.set(key, body);
      return res.status(200).json({ ok: true, savedAt: Date.now() });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message || 'Redis 错误' });
  }
}
