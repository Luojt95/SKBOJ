import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取分享详情并增加浏览量
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // 获取分享详情
    const { data: share, error } = await client
      .from("code_shares")
      .select("*")
      .eq("id", parseInt(id))
      .single();

    if (error || !share) {
      return NextResponse.json({ error: "分享不存在" }, { status: 404 });
    }

    // 获取作者信息
    let author = null;
    if (share.author_id) {
      const { data: authorData } = await client
        .from("users")
        .select("id, username, role")
        .eq("id", share.author_id)
        .single();
      author = authorData;
    }

    // 增加浏览量
    await client
      .from("code_shares")
      .update({ views: (share.views || 0) + 1 })
      .eq("id", parseInt(id));

    return NextResponse.json({ 
      share: {
        ...share,
        views: (share.views || 0) + 1,
        users: author
      }
    });
  } catch (error) {
    console.error("Get share error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 删除分享
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // 获取当前用户
    const authRes = await fetch(new URL("/api/auth/me", request.url), {
      headers: request.headers,
    });
    const authData = await authRes.json();
    const currentUser = authData.user;

    if (!currentUser) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    // 获取分享信息
    const { data: share, error: fetchError } = await client
      .from("code_shares")
      .select("id, author_id")
      .eq("id", parseInt(id))
      .single();

    if (fetchError || !share) {
      return NextResponse.json({ error: "分享不存在" }, { status: 404 });
    }

    // 检查权限：作者或管理员可删除
    const canDelete =
      share.author_id === currentUser.id ||
      currentUser.role === "admin" ||
      currentUser.role === "super_admin";

    if (!canDelete) {
      return NextResponse.json({ error: "无权删除" }, { status: 403 });
    }

    // 删除分享
    const { error: deleteError } = await client
      .from("code_shares")
      .delete()
      .eq("id", parseInt(id));

    if (deleteError) {
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("Delete share error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
