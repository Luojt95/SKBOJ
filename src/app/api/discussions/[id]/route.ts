import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { roleLevel } from "@/lib/constants";

// 检查权限
function canEditContent(user: { id: number; role: string }, authorId: number, authorRole: string): boolean {
  if (user.id === authorId) return true;
  const userLevel = roleLevel[user.role] || 0;
  const authorLevel = roleLevel[authorRole] || 0;
  return userLevel >= authorLevel;
}

// 获取讨论详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    const { data: discussion, error } = await client
      .from("discussions")
      .select("*")
      .eq("id", parseInt(id))
      .single();

    if (error || !discussion) {
      return NextResponse.json({ error: "讨论不存在" }, { status: 404 });
    }

    // 获取作者信息
    let author = null;
    if (discussion.author_id) {
      const { data: authorData } = await client
        .from("users")
        .select("id, username, role, name_color, total_rating")
        .eq("id", discussion.author_id)
        .single();
      author = authorData;
    }

    return NextResponse.json({ 
      discussion: {
        ...discussion,
        users: author
      }
    });
  } catch (error) {
    console.error("Get discussion error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 更新讨论
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
    const body = await request.json();

    // 获取讨论信息
    const { data: discussion } = await client
      .from("discussions")
      .select("id, author_id")
      .eq("id", parseInt(id))
      .single();

    if (!discussion) {
      return NextResponse.json({ error: "讨论不存在" }, { status: 404 });
    }

    // 获取作者信息
    const { data: authorData } = await client
      .from("users")
      .select("id, role")
      .eq("id", discussion.author_id)
      .single();

    // 检查权限
    const authorRole = authorData?.role || "user";
    if (!canEditContent(user, discussion.author_id, authorRole)) {
      return NextResponse.json({ error: "没有权限修改此讨论" }, { status: 403 });
    }

    const { data: updatedDiscussion, error } = await client
      .from("discussions")
      .update({
        title: body.title,
        content: body.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    return NextResponse.json({ discussion: updatedDiscussion });
  } catch (error) {
    console.error("Update discussion error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除讨论
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

    // 获取讨论信息
    const { data: discussion } = await client
      .from("discussions")
      .select("id, author_id")
      .eq("id", parseInt(id))
      .single();

    if (!discussion) {
      return NextResponse.json({ error: "讨论不存在" }, { status: 404 });
    }

    // 获取作者信息
    const { data: authorData } = await client
      .from("users")
      .select("id, role")
      .eq("id", discussion.author_id)
      .single();

    // 检查权限
    const authorRole = authorData?.role || "user";
    if (!canEditContent(user, discussion.author_id, authorRole)) {
      return NextResponse.json({ error: "没有权限删除此讨论" }, { status: 403 });
    }

    const { error } = await client
      .from("discussions")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete discussion error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
