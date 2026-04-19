import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

/**
 * 管理员工具：批量更新所有比赛参与者的得分
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

    // 获取所有比赛
    const { data: contests } = await client
      .from("contests")
      .select("id, format, problem_ids")
      .eq("is_visible", true);

    if (!contests || contests.length === 0) {
      return NextResponse.json({ success: true, message: "没有比赛", updated: 0 });
    }

    let totalUpdated = 0;
    let totalErrors = 0;

    for (const contest of contests) {
      try {
        // 获取该比赛的所有参赛者
        const { data: participants } = await client
          .from("contest_participants")
          .select("user_id")
          .eq("contest_id", contest.id);

        if (!participants || participants.length === 0) continue;

        for (const participant of participants) {
          // 获取该用户在该比赛中的所有提交
          const { data: submissions } = await client
            .from("submissions")
            .select("problem_id, score")
            .eq("user_id", participant.user_id)
            .eq("contest_id", contest.id);

          if (!submissions || submissions.length === 0) {
            // 没有提交，得分为0
            await client
              .from("contest_participants")
              .update({ score: 0 })
              .eq("contest_id", contest.id)
              .eq("user_id", participant.user_id);
            continue;
          }

          // 计算总分（每道题取最高分）
          const problemScores = new Map<number, number>();
          for (const sub of submissions) {
            const current = problemScores.get(sub.problem_id) || 0;
            const newScore = sub.score || 0;
            if (newScore > current) {
              problemScores.set(sub.problem_id, newScore);
            }
          }

          const totalScore = Array.from(problemScores.values()).reduce((a, b) => a + b, 0);

          // 更新得分
          const { error } = await client
            .from("contest_participants")
            .update({ score: totalScore })
            .eq("contest_id", contest.id)
            .eq("user_id", participant.user_id);

          if (error) {
            totalErrors++;
            console.error(`Error updating participant ${participant.user_id} in contest ${contest.id}:`, error);
          } else {
            totalUpdated++;
          }
        }
      } catch (err) {
        console.error(`Error processing contest ${contest.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `更新完成，成功: ${totalUpdated}，失败: ${totalErrors}`,
      totalUpdated,
      totalErrors,
    });
  } catch (error) {
    console.error("Batch update scores error:", error);
    return NextResponse.json({ error: "批量更新失败" }, { status: 500 });
  }
}
