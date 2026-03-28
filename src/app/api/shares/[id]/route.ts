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
