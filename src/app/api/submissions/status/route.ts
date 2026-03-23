import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取用户的题目提交状态
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ status: {} });
    }

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();

    // 获取用户所有提交记录，按题目分组
    const { data: submissions, error } = await client
      .from("submissions")
      .select("problem_id, status, score")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "获取失败" }, { status: 500 });
    }

    // 统计每道题的最佳状态
    const problemStatus: Record<number, { status: string; bestScore: number }> = {};

    for (const sub of submissions || []) {
      const pid = sub.problem_id;
      if (!problemStatus[pid]) {
        problemStatus[pid] = { status: sub.status, bestScore: sub.score || 0 };
      } else {
        // AC优先，然后按分数排序
        if (sub.status === "ac") {
          problemStatus[pid] = { status: "ac", bestScore: 100 };
        } else if (problemStatus[pid].status !== "ac") {
          if ((sub.score || 0) > problemStatus[pid].bestScore) {
            problemStatus[pid] = { status: sub.status, bestScore: sub.score || 0 };
          }
        }
      }
    }

    return NextResponse.json({ status: problemStatus });
  } catch (error) {
    console.error("Get problem status error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
