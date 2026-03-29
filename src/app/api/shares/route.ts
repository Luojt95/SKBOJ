import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { checkUserPermission } from "@/lib/warning-check";

// 获取分享列表
export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data: shares, error } = await client
      .from("code_shares")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Get shares error:", error);
      return NextResponse.json({ shares: [] });
    }

    // 获取作者信息
    const authorIds = [...new Set(shares?.map(s => s.author_id) || [])];
    const { data: users } = await client
      .from("users")
      .select("id, username, role")
      .in("id", authorIds);

    const userMap = new Map(users?.map(u => [u.id, u]) || []);

    const sharesWithAuthor = shares?.map(s => ({
      ...s,
      users: userMap.get(s.author_id) || null
    })) || [];

    return NextResponse.json({ shares: sharesWithAuthor });
  } catch (error) {
    console.error("Get shares error:", error);
    return NextResponse.json({ shares: [] });
  }
}

// 创建分享
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    
    // 检查用户权限
    const permission = await checkUserPermission(user.id, "shares");
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }
    
    const body = await request.json();
    const client = getSupabaseClient();

    const { data: share, error } = await client
      .from("code_shares")
      .insert({
        title: body.title,
        code: body.code,
        language: body.language,
        author_id: user.id,
        description: body.description,
        views: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Create share error:", error);
      return NextResponse.json({ error: "分享失败: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ share });
  } catch (error) {
    console.error("Create share error:", error);
    return NextResponse.json({ error: "分享失败" }, { status: 500 });
  }
}
