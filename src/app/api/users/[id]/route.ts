import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取用户信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    const { data: user, error } = await client
      .from("users")
      .select("id, username, role, credit_rating, problem_rating, contest_rating, total_rating, name_color, solved_easy, solved_medium, solved_hard, created_at")
      .eq("id", parseInt(id))
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 更新用户信息（管理员设置颜色）
export async function PATCH(
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

    const currentUser = JSON.parse(userCookie.value);

    if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const body = await request.json();
    const client = getSupabaseClient();

    const { data: user, error } = await client
      .from("users")
      .update({
        name_color: body.name_color,
      })
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
