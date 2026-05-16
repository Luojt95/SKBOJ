import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

let envLoaded = false;
let cachedClient: SupabaseClient | null = null;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function loadEnv(): void {
  if (envLoaded || (process.env.coze_supabase_url && process.env.coze_supabase_anon_key)) {
    return;
  }

  try {
    try {
      require('dotenv').config();
      if (process.env.coze_supabase_url && process.env.coze_supabase_anon_key) {
        envLoaded = true;
        return;
      }
    } catch {
      // dotenv not available
    }

    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }

    envLoaded = true;
    console.log('[Supabase] Environment variables loaded');
    console.log('[Supabase] url:', process.env.coze_supabase_url?.substring(0, 30) + '...');
  } catch (error) {
    console.error('[Supabase] Failed to load env:', error);
  }
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  const url = process.env.coze_supabase_url;
  const anonKey = process.env.coze_supabase_anon_key;

  if (!url) {
    console.error('[Supabase] coze_supabase_url is not set');
    throw new Error('coze_supabase_url is not set');
  }
  if (!anonKey) {
    console.error('[Supabase] coze_supabase_anon_key is not set');
    throw new Error('coze_supabase_anon_key is not set');
  }

  return { url, anonKey };
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  // 如果是相同的配置，返回缓存的客户端（不带 token 的情况）
  if (!token && cachedClient) {
    return cachedClient;
  }

  if (token) {
    return createClient(url, anonKey, {
      db: {
        timeout: 30000,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
  }

  const client = createClient(url, anonKey, {
    db: {
      timeout: 30000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 缓存不带 token 的客户端
  cachedClient = client;

  return client;
}

// 测试数据库连接
async function testConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('users').select('id').limit(1);
    if (error) {
      console.error('[Supabase] Connection test failed:', error.message);
      return false;
    }
    console.log('[Supabase] Connection test successful');
    return true;
  } catch (error) {
    console.error('[Supabase] Connection test error:', error);
    return false;
  }
}

// 获取使用 service role key 的客户端（绕过 RLS）
export function getAdminSupabaseClient(): SupabaseClient {
  const { url } = getSupabaseCredentials();
  const serviceKey = process.env.coze_supabase_service_role_key;
  
  if (!serviceKey) {
    console.error('[Supabase] Service role key not found');
  }
  
  return createClient(url, serviceKey || '', {
    db: {
      timeout: 30000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { loadEnv, getSupabaseCredentials, getSupabaseClient, testConnection };
