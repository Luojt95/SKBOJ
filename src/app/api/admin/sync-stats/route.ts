import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 同步用户做题统计（管理员专用）
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);

    // 只有管理员和站长可以调用
    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const client = getSupabaseClient();

    // 统计每个用户每个难度首次AC的题目数
    const { data: acStats, error: acError } = await client.rpc("sync_user_solved_stats");

    // 如果RPC不存在，直接用SQL
    if (acError) {
      // 获取所有AC记录
      const { data: submissions } = await client
        .from("submissions")
        .select("user_id, problem_id, status")
        .eq("status", "ac");

      const { data: problems } = await client
        .from("problems")
        .select("id, difficulty");

      if (!submissions || !problems) {
        return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
      }

      // 统计每个用户每个难度的首次AC题目
      const problemMap = new Map(problems.map(p => [p.id, p.difficulty]));
      const userStats = new Map<number, Map<string, Set<number>>>();

      for (const sub of submissions) {
        const difficulty = problemMap.get(sub.problem_id) || "popular";
        
        if (!userStats.has(sub.user_id)) {
          userStats.set(sub.user_id, new Map());
        }
        const userDifficulties = userStats.get(sub.user_id)!;
        
        if (!userDifficulties.has(difficulty)) {
          userDifficulties.set(difficulty, new Set());
        }
        userDifficulties.get(difficulty)!.add(sub.problem_id);
      }

      // 更新每个用户的统计
      const fieldMap: Record<string, string> = {
        "entry": "solved_entry",
        "popular_minus": "solved_popular_minus",
        "popular": "solved_popular",
        "popular_plus": "solved_popular_plus",
        "improve_plus": "solved_improve_plus",
        "provincial": "solved_provincial",
        "noi": "solved_noi",
      };

      let updatedCount = 0;
      for (const [userId, difficulties] of userStats) {
        const updateData: Record<string, number> = {
          problem_rating: 0,
          total_rating: 100,
        };

        for (const [difficulty, problems] of difficulties) {
          const field = fieldMap[difficulty] || "solved_popular";
          updateData[field] = problems.size;
          updateData.problem_rating += problems.size * 10;
          updateData.total_rating += problems.size * 10;
        }

        // 初始化所有难度字段为0
        for (const field of Object.values(fieldMap)) {
          if (!(field in updateData)) {
            updateData[field] = 0;
          }
        }

        const { error } = await client
          .from("users")
          .update(updateData)
          .eq("id", userId);

        if (!error) {
          updatedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `已同步 ${updatedCount} 个用户的做题统计`,
        userCount: updatedCount,
      });
    }

    return NextResponse.json({
      success: true,
      message: "同步完成",
      stats: acStats,
    });
  } catch (error) {
    console.error("Sync stats error:", error);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
