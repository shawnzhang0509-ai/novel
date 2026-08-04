import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedisFromEnv, redisEnvProbe } from './_redis';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const redis = getRedisFromEnv();
  const probe = redisEnvProbe();
  const anyVar = Object.values(probe).some(Boolean);

  return res.status(200).json({
    ok: true,
    redis: redis ? 'ready' : 'missing',
    env: probe,
    hint: redis
      ? 'Upstash Redis 已就绪'
      : anyVar
        ? '检测到部分变量，但 URL/TOKEN 不完整。请检查 Production 环境是否同时有 URL 和 TOKEN，并 Redeploy。'
        : 'Production 里还没有 Redis 变量。Vercel → novel → Settings → Environment Variables，确认 Storage 连接写入了变量且勾选 Production，再 Redeploy Production。',
  });
}
