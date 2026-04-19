import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

/**
 * 计算 Codeforces 风格的 Rating 变化
 * 
 * 参数:
 * - Ra: 用户当前 Rating
 * - Rb: 对手/比赛平均 Rating
 * - K: 系数（通常 10-32），等级越高 K 值越小
 * - score: 用户得分（0-1 之间，归一化）
 * 
 * 返回:
 * - newRating: 新的 Rating
 * - change: Rating 变化值
 */

// K 系数配置（Rating 越高，K 值越小）
function getKFactor(rating: number): number {
  if (rating < 500) return 48;
  if (rating < 1000) return 40;
  if (rating < 1500) return 32;
  if (rating < 2000) return 24;
  if (rating < 2500) return 16;
  return 8;
}

// 计算期望得分
function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// 计算 Rating 变化
function calculateRatingChange(
  currentRating: number,
  newRating: number
): { newRating: number; change: number } {
  const change = newRating - currentRating;
  return { newRating, change };
}

// 根据排名计算选手的归一化得分
function calculateScoreFromRank(rank: number, totalParticipants: number): number {
  if (totalParticipants === 0) return 0;
  // 排名第1得1分，排名最后得0分，中间线性插值
  return (totalParticipants - rank) / (totalParticipants - 1);
}

// 为单场比赛计算所有参赛者的 Rating 变化
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();
    const body = await request.json();

    const { contestId } = body;

    if (!contestId) {
      return NextResponse.json({ error: "缺少比赛ID" }, { status: 400 });
    }

    // 获取比赛信息
    const { data: contest, error: contestError } = await client
      .from("contests")
      .select("*")
      .eq("id", contestId)
      .single();

    if (contestError || !contest) {
      return NextResponse.json({ error: "比赛不存在" }, { status: 404 });
    }

    // 检查是否是管理员
    const { data: currentUser } = await client
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    // 检查 Div.4 不计算 Rating
    if (contest.div === "Div.4") {
      return NextResponse.json({ 
        error: "Div.4 不计入 Rating",
        message: "Div.4 比赛不会影响参赛者的 Rating"
      }, { status: 400 });
    }

    // 获取比赛的参赛者和他们的提交记录
    const { data: submissions, error: submissionsError } = await client
      .from("contest_participants")
      .select("*")
      .eq("contest_id", contestId);

    if (submissionsError) {
      console.error("Get submissions error:", submissionsError);
      return NextResponse.json({ error: "获取参赛记录失败" }, { status: 500 });
    }

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ error: "没有参赛记录" }, { status: 400 });
    }

    // 获取所有参赛者的当前 Rating
    const userIds = submissions.map((s: any) => s.user_id);
    const { data: users, error: usersError } = await client
      .from("users")
      .select("id, username, rating")
      .in("id", userIds);

    if (usersError) {
      console.error("Get users error:", usersError);
      return NextResponse.json({ error: "获取用户信息失败" }, { status: 500 });
    }

    // 建立用户 ID 到 Rating 的映射
    const userRatings: Record<number, number> = {};
    users?.forEach((u: any) => {
      userRatings[u.id] = u.rating || 0;
    });

    // 计算平均 Rating
    const totalRating = submissions.reduce((sum: number, s: any) => {
      return sum + (userRatings[s.user_id] || 0);
    }, 0);
    const averageRating = totalRating / submissions.length;

    // 根据比赛类型计算排名和分数
    // 这里简化处理：假设 submissions 已经包含最终分数和排名
    // 实际应用中可能需要根据比赛类型（OI/IOI/CS）计算最终分数
    
    // 按分数排序（降序）
    const sortedSubmissions = [...submissions].sort((a: any, b: any) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return scoreB - scoreA;
    });

    // 分配排名（处理同分情况）
    let currentRank = 1;
    sortedSubmissions.forEach((s: any, index: number) => {
      if (index > 0) {
        const prevScore = sortedSubmissions[index - 1].score || 0;
        const currentScore = s.score || 0;
        if (currentScore < prevScore) {
          currentRank = index + 1;
        }
      }
      s.rank = currentRank;
    });

    // 计算每个用户的 Rating 变化
    const ratingChanges: Record<number, { oldRating: number; newRating: number; change: number; rank: number }> = {};

    sortedSubmissions.forEach((submission: any) => {
      const userId = submission.user_id;
      const currentRating = userRatings[userId] || 0;
      const rank = submission.rank;
      const totalParticipants = sortedSubmissions.length;

      // 计算归一化得分
      const score = calculateScoreFromRank(rank, totalParticipants);

      // 计算期望得分（基于当前 Rating）
      const expectedScore = calculateExpectedScore(currentRating, averageRating);

      // 计算新的 Rating
      const kFactor = getKFactor(currentRating);
      const newRating = Math.round(currentRating + kFactor * (score - expectedScore));

      ratingChanges[userId] = {
        oldRating: currentRating,
        newRating,
        change: newRating - currentRating,
        rank,
      };
    });

    // 更新所有用户的 Rating 并记录历史
    const updatePromises = Object.entries(ratingChanges).map(([userId, data]) => {
      return Promise.all([
        // 更新用户 Rating
        client
          .from("users")
          .update({ rating: data.newRating })
          .eq("id", parseInt(userId)),
        // 记录 Rating 历史
        client
          .from("rating_history")
          .insert({
            user_id: parseInt(userId),
            contest_id: contestId,
            old_rating: data.oldRating,
            new_rating: data.newRating,
            change: data.change,
            rank: data.rank,
          }),
      ]);
    });

    await Promise.all(updatePromises);

    // 标记比赛已计算 Rating
    await client
      .from("contests")
      .update({ rating_calculated: true })
      .eq("id", contestId);

    // 更新当前用户的 cookie（让导航栏显示新的 Rating）
    const { data: updatedUser } = await client
      .from("users")
      .select("id, username, role, rating, points, avatar")
      .eq("id", user.id)
      .single();

    if (updatedUser) {
      cookieStore.set(
        "user",
        JSON.stringify({
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          rating: updatedUser.rating,
          points: updatedUser.points,
          avatar: updatedUser.avatar,
        }),
        {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: `已为 ${sortedSubmissions.length} 位参赛者计算 Rating`,
      data: {
        totalParticipants: sortedSubmissions.length,
        changes: Object.entries(ratingChanges).map(([userId, data]) => ({
          userId: parseInt(userId),
          username: users?.find((u: any) => u.id === parseInt(userId))?.username,
          ...data,
        })),
      },
    });
  } catch (error) {
    console.error("Calculate rating error:", error);
    return NextResponse.json({ error: "计算 Rating 失败" }, { status: 500 });
  }
}
