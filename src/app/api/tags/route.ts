import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取所有标签
export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data: tags, error } = await client
      .from("tags")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Get tags error:", error);
      return NextResponse.json({ error: "获取标签失败" }, { status: 500 });
    }

    return NextResponse.json({ tags: tags || [] });
  } catch (error) {
    console.error("Get tags error:", error);
    return NextResponse.json({ error: "获取标签失败" }, { status: 500 });
  }
}

// 创建或删除标签（仅站长可操作）
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);

    // 只有站长可以管理标签
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const client = getSupabaseClient();
    const body = await request.json();

    // 创建标签
    if (body.action === "create") {
      if (!body.name || body.name.trim().length === 0) {
        return NextResponse.json({ error: "标签名称不能为空" }, { status: 400 });
      }

      if (body.name.length > 20) {
        return NextResponse.json({ error: "标签名称不能超过20个字符" }, { status: 400 });
      }

      const { data: tag, error } = await client
        .from("tags")
        .insert({
          name: body.name.trim(),
          color: body.color || "#3b82f6",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json({ error: "标签已存在" }, { status: 400 });
        }
        console.error("Create tag error:", error);
        return NextResponse.json({ error: "创建标签失败" }, { status: 500 });
      }

      return NextResponse.json({ tag });
    }

    // 删除标签
    if (body.action === "delete") {
      if (!body.id) {
        return NextResponse.json({ error: "标签ID不能为空" }, { status: 400 });
      }

      const { error } = await client
        .from("tags")
        .delete()
        .eq("id", body.id);

      if (error) {
        console.error("Delete tag error:", error);
        return NextResponse.json({ error: "删除标签失败" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "无效的操作" }, { status: 400 });
  } catch (error) {
    console.error("Tag action error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
