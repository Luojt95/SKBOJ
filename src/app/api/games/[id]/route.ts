import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取单个游戏
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    let user = null;
    if (userCookie) {
      try {
        user = JSON.parse(userCookie.value);
      } catch {}
    }

    const { data: game, error } = await client
      .from("games")
      .select("*")
      .eq("id", parseInt(id))
      .single();

    if (error || !game) {
      return NextResponse.json({ error: "游戏不存在" }, { status: 404 });
    }

    const isAdmin = user && (user.role === "admin" || user.role === "super_admin");
    
    // 非管理员只能看到可见的游戏
    if (!game.is_visible && !isAdmin) {
      return NextResponse.json({ error: "游戏不存在" }, { status: 404 });
    }

    // 检查游戏类别权限 (FREE=-1表示需要登录但不需要Rating)
    const categoryLevels: Record<string, number> = {
      'FREE': -1,
      'D': 200,
      'C': 500,
      'B': 800,
      'A': 1200,
    };
    const isLoggedIn = !!user;
    const userRating = user?.rating || 0;
    const requiredLevel = categoryLevels[game.category] ?? 0;
    
    // FREE类游戏需要登录，其他类别需要对应的Rating
    if (!isAdmin) {
      if (requiredLevel === -1) {
        if (!isLoggedIn) {
          return NextResponse.json({ error: "请先登录后再访问此游戏" }, { status: 401 });
        }
      } else if (userRating < requiredLevel) {
        return NextResponse.json({ 
          error: `该游戏需要 Rating >= ${requiredLevel} 才能访问（当前: ${userRating}）` 
        }, { status: 403 });
      }
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error("Get game error:", error);
    return NextResponse.json({ error: "获取游戏失败" }, { status: 500 });
  }
}

// 更新游戏
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();

    // 只有管理员可以更新游戏
    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, html_code, thumbnail, is_visible, category } = body;

    // 验证类别
    const validCategories = ['FREE', 'D', 'C', 'B', 'A'];
    const gameCategory = category && validCategories.includes(category) ? category : 'FREE';

    const { data: game, error } = await client
      .from("games")
      .update({
        name: name ?? undefined,
        description: description ?? undefined,
        html_code: html_code ?? undefined,
        thumbnail: thumbnail ?? undefined,
        is_visible: is_visible ?? undefined,
        category: gameCategory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) {
      console.error("Update game error:", error);
      return NextResponse.json({ error: "更新游戏失败" }, { status: 500 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error("Update game error:", error);
    return NextResponse.json({ error: "更新游戏失败" }, { status: 500 });
  }
}

// 删除游戏
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();

    // 只有管理员可以删除游戏
    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const { error } = await client
      .from("games")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      console.error("Delete game error:", error);
      return NextResponse.json({ error: "删除游戏失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete game error:", error);
    return NextResponse.json({ error: "删除游戏失败" }, { status: 500 });
  }
}
