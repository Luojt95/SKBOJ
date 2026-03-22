import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取分享列表
export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data: shares, error } = await client
      .from("code_shares")
      .select("*, users(username)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: "获取失败" }, { status: 500 });
    }

    return NextResponse.json({ shares });
  } catch (error) {
    console.error("Get shares error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
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
      })
      .select("*, users(username)")
      .single();

    if (error) {
      return NextResponse.json({ error: "分享失败" }, { status: 500 });
    }

    return NextResponse.json({ share });
  } catch (error) {
    console.error("Create share error:", error);
    return NextResponse.json({ error: "分享失败" }, { status: 500 });
  }
}
