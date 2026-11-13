import { createHmac } from 'crypto';

export const LOGIN_IP_LIMIT = 30;
export const LOGIN_ACCOUNT_LIMIT = 10;

export interface RateLimitDb {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

function digest(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export async function consumeLoginAttempt(
  db: RateLimitDb,
  ip: string,
  identifier: string,
  secret: string,
): Promise<boolean> {
  const ipKey = digest(secret, `login-ip:${ip}`);
  const accountKey = digest(secret, `login-account:${identifier.trim().toLowerCase()}`);
  const { data, error } = await db.rpc('consume_login_attempt', {
    p_ip_key: ipKey,
    p_account_key: accountKey,
    p_ip_max_attempts: LOGIN_IP_LIMIT,
    p_account_max_attempts: LOGIN_ACCOUNT_LIMIT,
  });
  if (error) throw new Error(`Login rate limit check failed: ${error.message}`);
  return data === true;
}

export async function resetLoginAttempts(
  db: RateLimitDb,
  ip: string,
  identifier: string,
  secret: string,
): Promise<void> {
  const ipKey = digest(secret, `login-ip:${ip}`);
  const accountKey = digest(secret, `login-account:${identifier.trim().toLowerCase()}`);
  const { error } = await db.rpc('reset_login_attempts', {
    p_ip_key: ipKey,
    p_account_key: accountKey,
  });
  if (error) throw new Error(`Login rate limit reset failed: ${error.message}`);
}

export function requestIp(req: Request): string {
  const trusted = req.headers.get('x-vercel-forwarded-for') ?? req.headers.get('x-real-ip');
  if (trusted?.trim()) return trusted.trim().split(',')[0].slice(0, 64);
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded?.trim()) return forwarded.trim().split(',')[0].slice(0, 64);
  return 'unknown';
}
