import { NextResponse } from "next/server";

// 数据库诊断 API - 不依赖 Supabase 客户端
export async function GET() {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase: {
      url: {
        set: false,
        value: null as string | null,
        prefix: null as string | null,
      },
      anonKey: {
        set: false,
        prefix: null as string | null,
      },
    },
    steps: [] as string[],
    errors: [] as string[],
  };

  // 检查环境变量
  const supabaseUrl = process.env.coze_supabase_url;
  const supabaseKey = process.env.coze_supabase_anon_key;

  if (supabaseUrl) {
    diagnosis.supabase.url.set = true;
    diagnosis.supabase.url.value = supabaseUrl;
    diagnosis.supabase.url.prefix = supabaseUrl.substring(0, 40) + '...';
    diagnosis.steps.push('✅ coze_supabase_url 已设置');
  } else {
    diagnosis.errors.push('❌ coze_supabase_url 未设置');
  }

  if (supabaseKey) {
    diagnosis.supabase.anonKey.set = true;
    diagnosis.supabase.anonKey.prefix = supabaseKey.substring(0, 20) + '...';
    diagnosis.steps.push('✅ coze_supabase_anon_key 已设置');
  } else {
    diagnosis.errors.push('❌ coze_supabase_anon_key 未设置');
  }

  // 如果环境变量都设置了，测试连接
  if (supabaseUrl && supabaseKey) {
    diagnosis.steps.push('🔄 正在测试 Supabase 连接...');
    
    try {
      // 直接使用 fetch 测试连接
      const response = await fetch(`${supabaseUrl}/rest/v1/users?select=id&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        diagnosis.steps.push('✅ Supabase 连接成功！');
      } else {
        const errorText = await response.text();
        diagnosis.errors.push(`❌ Supabase 返回错误: ${response.status} ${response.statusText}`);
        diagnosis.errors.push(`   响应: ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      diagnosis.errors.push(`❌ 连接 Supabase 失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 检查其他可能的环境变量名
  const otherEnvVars = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  const foundOthers = Object.entries(otherEnvVars)
    .filter(([, v]) => v)
    .map(([k]) => k);

  if (foundOthers.length > 0) {
    diagnosis.steps.push(`⚠️ 发现其他 Supabase 环境变量: ${foundOthers.join(', ')}`);
    diagnosis.steps.push('   请使用 coze_supabase_url 和 coze_supabase_anon_key');
  }

  return NextResponse.json(diagnosis);
}
