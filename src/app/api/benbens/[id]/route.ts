import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取单个犇犇详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    const { data: benben, error } = await client
      .from("benbens")
      .select("*")
      .eq("id", parseInt(id))
      .single();

    if (error || !benben) {
      return NextResponse.json({ error: "犇犇不存在" }, { status: 404 });
    }

    // 获取用户信息
    const { data: user } = await client
      .from("users")
      .select("id, username, role, points")
      .eq("id", benben.author_id)
      .single();

    return NextResponse.json({ 
      benben: {
        ...benben,
        author: user
      }
    });
  } catch (error) {
    console.error("Get benben error:", error);
    return NextResponse.json({ error: "获取犇犇失败" }, { status: 500 });
  }
}

// 删除犇犇
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const { id } = await params;
    const client = getSupabaseClient();

    // 获取犇犇信息
    const { data: benben, error: fetchError } = await client
      .from("benbens")
      .select("author_id, parent_id")
      .eq("id", parseInt(id))
      .single();

    if (fetchError || !benben) {
      return NextResponse.json({ error: "犇犇不存在" }, { status: 404 });
    }

    // 检查权限：作者或管理员可以删除
    const { data: currentUser } = await client
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (benben.author_id !== user.id && 
        currentUser?.role !== "admin" && 
        currentUser?.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限删除" }, { status: 403 });
    }

    // 如果是回复，更新父犇犇的回复数
    if (benben.parent_id) {
      const { data: parent } = await client
        .from("benbens")
        .select("reply_count")
        .eq("id", benben.parent_id)
        .single();

      if (parent) {
        await client
          .from("benbens")
          .update({ reply_count: Math.max(0, (parent.reply_count || 0) - 1) })
          .eq("id", benben.parent_id);
      }
    }

    // 删除犇犇（级联删除回复）
    const { error: deleteError } = await client
      .from("benbens")
      .delete()
      .eq("id", parseInt(id));

    if (deleteError) {
      console.error("Delete benben error:", deleteError);
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete benben error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

// 点赞犇犇
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const client = getSupabaseClient();

    if (body.action === "like") {
      // 获取当前点赞数
      const { data: benben } = await client
        .from("benbens")
        .select("likes")
        .eq("id", parseInt(id))
        .single();

      if (!benben) {
        return NextResponse.json({ error: "犇犇不存在" }, { status: 404 });
      }

      // 增加点赞
      const { error } = await client
        .from("benbens")
        .update({ likes: (benben.likes || 0) + 1 })
        .eq("id", parseInt(id));

      if (error) {
        return NextResponse.json({ error: "点赞失败" }, { status: 500 });
      }

      return NextResponse.json({ likes: (benben.likes || 0) + 1 });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error) {
    console.error("Like benben error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
