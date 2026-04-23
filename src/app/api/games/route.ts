import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取游戏列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get("is_admin") === "true";

    let query = client
      .from("games")
      .select("*")
      .order("created_at", { ascending: false });

    // 非管理员只能看到可见的游戏
    if (!isAdmin) {
      query = query.eq("is_visible", true);
    }

    const { data: games, error } = await query;

    if (error) {
      console.error("Get games error:", error);
      return NextResponse.json({ error: "获取游戏列表失败" }, { status: 500 });
    }

    return NextResponse.json({ games: games || [] });
  } catch (error) {
    console.error("Get games error:", error);
    return NextResponse.json({ error: "获取游戏列表失败" }, { status: 500 });
  }
}

// 创建游戏（仅管理员）
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();

    // 只有管理员可以创建游戏
    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, html_code, thumbnail, is_visible } = body;

    if (!name || !html_code) {
      return NextResponse.json({ error: "游戏名称和代码不能为空" }, { status: 400 });
    }

    const { data: game, error } = await client
      .from("games")
      .insert({
        name,
        description: description || "",
        html_code,
        thumbnail: thumbnail || "",
        is_visible: is_visible ?? true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Create game error:", error);
      return NextResponse.json({ error: "创建游戏失败" }, { status: 500 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error("Create game error:", error);
    return NextResponse.json({ error: "创建游戏失败" }, { status: 500 });
  }
}
