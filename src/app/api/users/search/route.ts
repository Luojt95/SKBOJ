import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 搜索用户
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "缺少用户名参数" }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { data: users, error } = await client
      .from("users")
      .select("id, username, role, name_color, total_rating")
      .ilike("username", `%${username}%`)
      .limit(10);

    if (error) {
      console.error("Search users error:", error);
      return NextResponse.json({ error: "搜索失败" }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error("Search users error:", error);
    return NextResponse.json({ error: "搜索失败" }, { status: 500 });
  }
}
