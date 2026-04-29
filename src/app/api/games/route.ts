import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取游戏列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");
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

    // 根据用户 Rating 过滤可见游戏
    let userRating = 0;
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie.value);
        userRating = user.rating || 0;
      } catch {}
    }

    // 类别等级映射 (FREE=-1表示需要登录但不需要Rating)
    const categoryLevels: Record<string, number> = {
      'FREE': -1,  // 需要登录
      'D': 200,
      'C': 500,
      'B': 800,
      'A': 1200,
    };

    const isLoggedIn = !!userCookie;
    // 管理员/站长可以看所有游戏
    const filteredGames = games?.filter((game: any) => {
      if (isAdmin) return true; // 管理员看全部
      const requiredLevel = categoryLevels[game.category] ?? 0;
      // FREE类游戏需要登录，其他类别需要对应的Rating
      if (requiredLevel === -1) {
        return isLoggedIn;
      }
      return isLoggedIn && userRating >= requiredLevel;
    }) || [];

    return NextResponse.json({ games: filteredGames, userRating, isLoggedIn, isAdmin });
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
    const { name, description, html_code, thumbnail, is_visible, category } = body;

    if (!name || !html_code) {
      return NextResponse.json({ error: "游戏名称和代码不能为空" }, { status: 400 });
    }

    // 验证类别
    const validCategories = ['FREE', 'D', 'C', 'B', 'A'];
    const gameCategory = validCategories.includes(category) ? category : 'FREE';

    const { data: game, error } = await client
      .from("games")
      .insert({
        name,
        description: description || "",
        html_code,
        thumbnail: thumbnail || "",
        is_visible: is_visible ?? true,
        category: gameCategory,
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
