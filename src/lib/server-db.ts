import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  resolveServerSupabaseConfig,
  SupabaseConfigurationError,
  type SupabaseEnvironment,
} from './supabase-config';

function environment(): SupabaseEnvironment {
  const vercelEnv = process.env.VERCEL_ENV;
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    deployment: vercelEnv === 'preview' || vercelEnv === 'production'
      ? vercelEnv
      : 'development',
  };
}

export function serviceDb(): SupabaseClient {
  const config = resolveServerSupabaseConfig(environment());
  if (!config.configured) {
    throw new SupabaseConfigurationError(config.missing);
  }
  if (!config.serviceRoleKey) {
    throw new SupabaseConfigurationError(['SUPABASE_SERVICE_ROLE_KEY']);
  }
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseConfigurationError(): string | null {
  try {
    const config = resolveServerSupabaseConfig(environment());
    if (config.configured) return null;
    return new SupabaseConfigurationError(config.missing).message;
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) return error.message;
    throw error;
  }
}

export function isLiveConfigured(): boolean {
  return getSupabaseConfigurationError() === null;
}
