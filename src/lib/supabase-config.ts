export type SupabaseDeployment = 'development' | 'preview' | 'production';

export interface SupabaseEnvironment {
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
  serviceRoleKeyConfigured?: boolean;
  deployment: SupabaseDeployment;
}

export class SupabaseConfigurationError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Supabase configuration is incomplete. Missing required environment variables: ${missing.join(', ')}.`);
    this.name = 'SupabaseConfigurationError';
    this.missing = missing;
  }
}

export interface SupabaseClientConfig {
  configured: true;
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export interface LocalSupabaseConfig {
  configured: false;
  missing: string[];
}

function isSet(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function requireValues(
  environment: SupabaseEnvironment,
  required: Array<{ value: string | undefined; name: string }>,
  serviceRoleKeyConfigured: boolean,
): LocalSupabaseConfig | SupabaseClientConfig {
  const missing = required
    .filter(({ value }) => !isSet(value))
    .map(({ name }) => name);
  if (required.some(({ name }) => name === 'SUPABASE_SERVICE_ROLE_KEY') && serviceRoleKeyConfigured) {
    const index = missing.indexOf('SUPABASE_SERVICE_ROLE_KEY');
    if (index >= 0) missing.splice(index, 1);
  }

  if (missing.length === 0) {
    return {
      configured: true,
      url: environment.url!.trim(),
      anonKey: environment.anonKey!.trim(),
      ...(isSet(environment.serviceRoleKey) ? { serviceRoleKey: environment.serviceRoleKey.trim() } : {}),
    };
  }

  const allValuesAbsent = required.every(({ value }) => !isSet(value)) && !serviceRoleKeyConfigured;
  if (allValuesAbsent && environment.deployment === 'development') {
    return { configured: false, missing };
  }
  throw new SupabaseConfigurationError(missing);
}

export function resolveBrowserSupabaseConfig(
  environment: SupabaseEnvironment,
): LocalSupabaseConfig | SupabaseClientConfig {
  const browserEnvironment = {
    ...environment,
    serviceRoleKey: undefined,
  };
  return requireValues(
    browserEnvironment,
    [
      { value: browserEnvironment.url, name: 'NEXT_PUBLIC_SUPABASE_URL' },
      { value: browserEnvironment.anonKey, name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
      {
        value: undefined,
        name: 'SUPABASE_SERVICE_ROLE_KEY',
      },
    ],
    environment.serviceRoleKeyConfigured ?? false,
  );
}

export function resolveServerSupabaseConfig(
  environment: SupabaseEnvironment,
): LocalSupabaseConfig | SupabaseClientConfig {
  return requireValues(
    environment,
    [
      { value: environment.url, name: 'NEXT_PUBLIC_SUPABASE_URL' },
      { value: environment.anonKey, name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
      { value: environment.serviceRoleKey, name: 'SUPABASE_SERVICE_ROLE_KEY' },
    ],
    false,
  );
}
