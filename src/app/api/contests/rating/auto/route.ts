import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

/**
 * 管理员手动触发：检查并计算所有已结束但未计算Rating的比赛
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();

    // 检查是否是管理员
    const { data: currentUser } = await client
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    // 获取所有已结束但未计算Rating的比赛
    const now = new Date().toISOString();
    const { data: contests, error: contestsError } = await client
      .from("contests")
      .select("*")
      .eq("rating_calculated", false)
      .eq("is_visible", true)
      .eq("div", "Div.2")  // 只计算 Div.2 的比赛
      .lt("end_time", now);

    if (contestsError) {
      console.error("Get contests error:", contestsError);
      return NextResponse.json({ error: "获取比赛列表失败" }, { status: 500 });
    }

    if (!contests || contests.length === 0) {
      return NextResponse.json({
        success: true,
        message: "没有需要计算Rating的比赛",
        processed: 0,
      });
    }

    const results = [];

    for (const contest of contests) {
      try {
        // 获取参赛者
        const { data: participants } = await client
          .from("contest_participants")
          .select("user_id, score")
          .eq("contest_id", contest.id);

        if (!participants || participants.length === 0) {
          // 没有参赛者，标记为已计算
          await client
            .from("contests")
            .update({ rating_calculated: true })
            .eq("id", contest.id);
          results.push({ contestId: contest.id, status: "skipped", reason: "no participants" });
          continue;
        }

        // 获取参赛者当前Rating
        const userIds = participants.map((p: any) => p.user_id);
        const { data: users } = await client
          .from("users")
          .select("id, username, rating")
          .in("id", userIds);

        const userRatings: Record<number, number> = {};
        users?.forEach((u: any) => {
          userRatings[u.id] = u.rating || 0;
        });

        // 计算平均Rating
        const totalRating = participants.reduce((sum: number, p: any) => {
          return sum + (userRatings[p.user_id] || 0);
        }, 0);
        const averageRating = totalRating / participants.length;

        // 按分数排序
        const sortedParticipants = [...participants].sort((a: any, b: any) => {
          const scoreA = a.score || 0;
          const scoreB = b.score || 0;
          return scoreB - scoreA;
        });

        // K系数
        const getKFactor = (rating: number): number => {
          if (rating < 500) return 48;
          if (rating < 1000) return 40;
          if (rating < 1500) return 32;
          if (rating < 2000) return 24;
          if (rating < 2500) return 16;
          return 8;
        };

        // 期望得分计算
        const calculateExpectedScore = (ratingA: number, ratingB: number): number => {
          return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
        };

        // 根据排名计算归一化得分
        const calculateScoreFromRank = (rank: number, total: number): number => {
          if (total <= 1) return 1;
          return (total - rank) / (total - 1);
        };

        // 计算并更新每个用户的Rating
        for (let i = 0; i < sortedParticipants.length; i++) {
          const participant = sortedParticipants[i];
          const userId = participant.user_id;
          const currentRating = userRatings[userId] || 0;
          const rank = i + 1;
          const totalParticipants = sortedParticipants.length;

          // 计算归一化得分
          const score = calculateScoreFromRank(rank, totalParticipants);
          // 计算期望得分
          const expectedScore = calculateExpectedScore(currentRating, averageRating);
          // 计算新Rating
          const kFactor = getKFactor(currentRating);
          const newRating = Math.round(currentRating + kFactor * (score - expectedScore));

          // 更新用户Rating
          await client
            .from("users")
            .update({ rating: newRating })
            .eq("id", userId);

          // 记录Rating历史
          await client
            .from("rating_history")
            .insert({
              user_id: userId,
              contest_id: contest.id,
              old_rating: currentRating,
              new_rating: newRating,
              change: newRating - currentRating,
              rank: rank,
            });
        }

        // 标记比赛已计算Rating
        await client
          .from("contests")
          .update({ rating_calculated: true })
          .eq("id", contest.id);

        results.push({ contestId: contest.id, participants: sortedParticipants.length, status: "success" });
      } catch (err) {
        console.error(`Error processing contest ${contest.id}:`, err);
        results.push({ contestId: contest.id, status: "error", error: String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      message: `处理了 ${results.length} 场比赛`,
      results,
    });
  } catch (error) {
    console.error("Auto calculate rating error:", error);
    return NextResponse.json({ error: "自动计算Rating失败" }, { status: 500 });
  }
}
