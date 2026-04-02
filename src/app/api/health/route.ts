import { NextResponse } from "next/server";
import { getSupabaseClient, testConnection } from "@/storage/database/supabase-client";

// 健康检查 API
export async function GET() {
  const health: {
    status: "ok" | "error";
    timestamp: string;
    database: {
      connected: boolean;
      error?: string;
    };
    env: {
      hasUrl: boolean;
      hasKey: boolean;
    };
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: {
      connected: false,
    },
    env: {
      hasUrl: !!process.env.COZE_SUPABASE_URL,
      hasKey: !!process.env.COZE_SUPABASE_ANON_KEY,
    },
  };

  try {
    // 测试数据库连接
    const client = getSupabaseClient();
    const { error } = await client.from('users').select('id').limit(1).maybeSingle();
    
    if (error) {
      health.database.connected = false;
      health.database.error = error.message;
      health.status = "error";
    } else {
      health.database.connected = true;
    }
  } catch (error) {
    health.database.connected = false;
    health.database.error = error instanceof Error ? error.message : "Unknown error";
    health.status = "error";
  }

  return NextResponse.json(health);
}
