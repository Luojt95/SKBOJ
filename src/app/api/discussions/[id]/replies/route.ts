import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取讨论的回复列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const discussionId = parseInt(id);

    if (isNaN(discussionId)) {
      return NextResponse.json({ replies: [] });
    }

    const client = getSupabaseClient();

    // 获取回复
    const { data: replies, error } = await client
      .from("discussions")
      .select("*")
      .eq("parent_id", discussionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Get replies error:", error);
      return NextResponse.json({ replies: [] });
    }

    // 获取用户信息
    let repliesWithUsers = [];
    if (replies && replies.length > 0) {
      const authorIds = [...new Set(replies.map(r => r.author_id))];

      const { data: users } = await client
        .from("users")
        .select("id, username, role")
        .in("id", authorIds);

      const usersMap = new Map((users || []).map(u => [u.id, u]));

      repliesWithUsers = replies.map(r => ({
        ...r,
        users: usersMap.get(r.author_id) || null
      }));
    }

    return NextResponse.json({ replies: repliesWithUsers });
  } catch (error) {
    console.error("Get replies error:", error);
    return NextResponse.json({ replies: [] });
  }
}
