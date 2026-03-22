import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

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
      .select("author_id")
      .eq("id", parseInt(id))
      .single();

    if (!discussion) {
      return NextResponse.json({ error: "讨论不存在" }, { status: 404 });
    }

    // 检查权限
    if (
      discussion.author_id !== user.id &&
      user.role !== "admin" &&
      user.role !== "super_admin"
    ) {
      return NextResponse.json({ error: "没有权限删除" }, { status: 403 });
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
