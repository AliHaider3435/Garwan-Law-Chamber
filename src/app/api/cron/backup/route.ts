import { snapshotBackup } from '@/lib/chamber-ops';
import { SupabaseConfigurationError } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const result = await snapshotBackup();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof SupabaseConfigurationError) {
      return Response.json({ error: e.message }, { status: 503 });
    }
    return new Response((e as Error).message, { status: 500 });
  }
}
