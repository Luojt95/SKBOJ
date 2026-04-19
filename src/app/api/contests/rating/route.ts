import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

/**
 * Codeforces 风格的 Rating 计算系统
 * 
 * 核心公式：
 * - 期望得分 = sum(1 / (1 + 10^((对手Rating - 用户Rating)/400)))
 * - 实际得分 = 基于排名的归一化得分
 * - Rating变化 = K * (实际得分 - 期望得分)
 * 
 * K 因子（根据Rating级别调整）：
 * - < 1200 (Newbie/Pupil): K = 40
 * - 1200-1399 (Specialist): K = 32
 * - 1400-1599 (Expert): K = 24
 * - 1600-1899 (Candidate Master): K = 20
 * - 1900-2099 (Master): K = 16
 * - 2100-2399 (International Master/Grandmaster): K = 12
 * - 2400-2699 (International Grandmaster): K = 8
 * - 2700+ (Legendary Grandmaster): K = 4
 */

// K 因子配置（Rating 越高，K 值越小，表现差时扣分更狠）
function getKFactor(rating: number): number {
  if (rating < 1200) return 40;     // 新手/ Pupil
  if (rating < 1400) return 32;     // Specialist
  if (rating < 1600) return 24;      // Expert
  if (rating < 1900) return 20;      // Candidate Master
  if (rating < 2100) return 16;     // Master
  if (rating < 2400) return 12;      // International Master / Grandmaster
  if (rating < 2700) return 8;       // International Grandmaster
  return 4;                           // Legendary Grandmaster
}

// 计算用户A对用户B的期望得分（胜率）
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// 计算实际得分（基于排名）
// Codeforces风格：排名第1得1分，最后一名得0分
function calculateActualScore(rank: number, totalParticipants: number): number {
  if (totalParticipants <= 1) return 1;
  // 线性插值：第1名=1分，最后一名=0分
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

    // 获取比赛的参赛者和他们的得分
    const { data: participants, error: participantsError } = await client
      .from("contest_participants")
      .select("*")
      .eq("contest_id", contestId);

    if (participantsError) {
      console.error("Get participants error:", participantsError);
      return NextResponse.json({ error: "获取参赛记录失败" }, { status: 500 });
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({ error: "没有参赛记录" }, { status: 400 });
    }

    // 获取所有参赛者的当前 Rating
    const userIds = participants.map((p: any) => p.user_id);
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
    const userNames: Record<number, string> = {};
    users?.forEach((u: any) => {
      userRatings[u.id] = u.rating || 0;
      userNames[u.id] = u.username;
    });

    // 按分数排序（降序），同分按提交时间升序（先提交排前面）
    const sortedParticipants = [...participants].sort((a: any, b: any) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      // 同分按提交时间排序（假设有created_at字段）
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    // 分配排名（处理同分情况，同分的用户排名相同）
    let currentRank = 1;
    let prevScore: number | null = null;
    sortedParticipants.forEach((p: any, index: number) => {
      if (prevScore !== null && (p.score || 0) < prevScore) {
        currentRank = index + 1;
      }
      p.rank = currentRank;
      prevScore = p.score || 0;
    });

    const totalParticipants = sortedParticipants.length;

    console.log(`[Rating] Contest ${contestId}, ${totalParticipants} participants`);
    console.log(`[Rating] Participants:`, sortedParticipants.map(p => ({
      userId: p.user_id,
      score: p.score,
      rank: p.rank,
      rating: userRatings[p.user_id] || 0
    })));

    // 计算每个用户的 Rating 变化
    // 核心算法：遍历每个位置，计算期望得分和实际得分
    const ratingChanges: Record<number, { 
      oldRating: number; 
      newRating: number; 
      change: number; 
      rank: number;
      expectedScore: number;
      actualScore: number;
    }> = {};

    for (const participant of sortedParticipants) {
      const userId = participant.user_id;
      const currentRating = userRatings[userId] || 0;
      const rank = participant.rank;

      // 计算期望得分：用户对所有其他参赛者的期望得分之和的平均
      let expectedScoreSum = 0;
      const otherParticipants = sortedParticipants.filter(p => p.user_id !== userId);
      
      if (otherParticipants.length > 0) {
        for (const other of otherParticipants) {
          const otherRating = userRatings[other.user_id] || 0;
          expectedScoreSum += expectedScore(currentRating, otherRating);
        }
        // 期望得分归一化（0-1之间）
        expectedScoreSum = expectedScoreSum / otherParticipants.length;
      } else {
        // 只有1个参赛者，期望得分为0.5
        expectedScoreSum = 0.5;
      }

      // 实际得分（基于排名）
      const actual = calculateActualScore(rank, totalParticipants);

      // K 因子
      const k = getKFactor(currentRating);

      // Rating 变化（CF风格）
      const ratingDelta = Math.round(k * (actual - expectedScoreSum));
      const newRating = Math.max(0, currentRating + ratingDelta); // Rating 不能为负

      console.log(`[Rating] User ${userId} (${userNames[userId]}): rating=${currentRating}, rank=${rank}, expected=${expectedScoreSum.toFixed(3)}, actual=${actual.toFixed(3)}, k=${k}, delta=${ratingDelta}, newRating=${newRating}`);

      ratingChanges[userId] = {
        oldRating: currentRating,
        newRating,
        change: ratingDelta,
        rank,
        expectedScore: expectedScoreSum,
        actualScore: actual,
      };
    }

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
      message: `已为 ${sortedParticipants.length} 位参赛者计算 Rating`,
      data: {
        totalParticipants: sortedParticipants.length,
        changes: Object.entries(ratingChanges).map(([userId, data]) => ({
          userId: parseInt(userId),
          username: userNames[parseInt(userId)],
          ...data,
        })),
      },
    });
  } catch (error) {
    console.error("Calculate rating error:", error);
    return NextResponse.json({ error: "计算 Rating 失败" }, { status: 500 });
  }
}
