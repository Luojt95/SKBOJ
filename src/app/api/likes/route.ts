import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取点赞状态
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ liked: false });
    }

    const user = JSON.parse(userCookie.value);
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");

    if (!targetType || !targetId) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { data: like } = await client
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("target_type", targetType)
      .eq("target_id", parseInt(targetId))
      .single();

    return NextResponse.json({ liked: !!like });
  } catch (error) {
    console.error("Get like status error:", error);
    return NextResponse.json({ liked: false });
  }
}

// 点赞/取消点赞
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    const { targetType, targetId, action } = body; // action: "like" or "unlike"

    if (!targetType || !targetId || !action) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const validTypes = ["solution", "discussion", "benben"];
    if (!validTypes.includes(targetType)) {
      return NextResponse.json({ error: "无效的目标类型" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 检查是否已点赞
    const { data: existingLike } = await client
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .single();

    const tableMap: Record<string, string> = {
      solution: "solutions",
      discussion: "discussions",
      benben: "benbens",
    };

    const table = tableMap[targetType];

    if (action === "like" && !existingLike) {
      // 添加点赞记录
      const { error: likeError } = await client
        .from("likes")
        .insert({
          user_id: user.id,
          target_type: targetType,
          target_id: targetId,
        });

      if (likeError) {
        // 如果表不存在，忽略错误（表已在前面的SQL创建）
        if (!likeError.message.includes("does not exist")) {
          console.error("Like insert error:", likeError);
        }
      }

      // 更新点赞数
      const { data: target } = await client
        .from(table)
        .select("likes")
        .eq("id", targetId)
        .single();

      if (target) {
        await client
          .from(table)
          .update({ likes: (target.likes || 0) + 1 })
          .eq("id", targetId);
      }

      return NextResponse.json({ success: true, liked: true, likes: (target?.likes || 0) + 1 });
    } else if (action === "unlike" && existingLike) {
      // 删除点赞记录
      await client
        .from("likes")
        .delete()
        .eq("id", existingLike.id);

      // 更新点赞数
      const { data: target } = await client
        .from(table)
        .select("likes")
        .eq("id", targetId)
        .single();

      if (target) {
        await client
          .from(table)
          .update({ likes: Math.max(0, (target.likes || 0) - 1) })
          .eq("id", targetId);
      }

      return NextResponse.json({ success: true, liked: false, likes: Math.max(0, (target?.likes || 0) - 1) });
    }

    return NextResponse.json({ success: true, liked: action === "like" });
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
