import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

/**
 * SKBOJ Rating 计算系统（针对用户少的场景优化）
 * 
 * 特点：
 * - 小规模比赛Rating变化更大（帮助新手快速成长）
 * - 单人AK大幅加分
 * - 新手期加分更激进
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
    const body = await request.json();

    const { contestId } = body;

    if (!contestId) {
      return NextResponse.json({ error: "缺少比赛ID" }, { status: 400 });
    }

    const { data: contest, error: contestError } = await client
      .from("contests")
      .select("*")
      .eq("id", contestId)
      .single();

    if (contestError || !contest) {
      return NextResponse.json({ error: "比赛不存在" }, { status: 404 });
    }

    const { data: currentUser } = await client
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    if (contest.div === "Div.4") {
      return NextResponse.json({ 
        error: "Div.4 不计入 Rating",
        message: "Div.4 比赛不会影响参赛者的 Rating"
      }, { status: 400 });
    }

    const { data: participants, error: participantsError } = await client
      .from("contest_participants")
      .select("*")
      .eq("contest_id", contestId);

    if (participantsError || !participants || participants.length === 0) {
      return NextResponse.json({ error: "没有参赛记录" }, { status: 400 });
    }

    const userIds = participants.map((p: any) => p.user_id);
    const { data: users, error: usersError } = await client
      .from("users")
      .select("id, username, rating")
      .in("id", userIds);

    if (usersError) {
      return NextResponse.json({ error: "获取用户信息失败" }, { status: 500 });
    }

    const userRatings: Record<number, number> = {};
    const userNames: Record<number, string> = {};
    users?.forEach((u: any) => {
      userRatings[u.id] = u.rating || 0;
      userNames[u.id] = u.username;
    });

    // 排序并分配排名
    const sortedParticipants = [...participants].sort((a: any, b: any) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

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

    const ratingChanges: Record<number, { 
      oldRating: number; 
      newRating: number; 
      change: number; 
      rank: number;
    }> = {};

    // 计算所有用户的Rating差距
    const allRatings = sortedParticipants.map(p => userRatings[p.user_id] || 0);
    const avgRating = allRatings.reduce((a, b) => a + b, 0) / (totalParticipants || 1);

    for (const participant of sortedParticipants) {
      const userId = participant.user_id;
      const currentRating = userRatings[userId] || 0;
      const rank = participant.rank;
      const score = participant.score || 0;

      let ratingDelta: number;

      // ============ 核心Rating变化计算 ============
      
      if (totalParticipants === 1) {
        // 单人比赛：AK获得大幅加分（模拟CF体验）
        // Rating < 1000: +300分
        // Rating 1000-1500: +200分
        // Rating > 1500: +150分
        if (currentRating < 1000) {
          ratingDelta = 300;
        } else if (currentRating < 1500) {
          ratingDelta = 200;
        } else {
          ratingDelta = 150;
        }
        
      } else if (totalParticipants === 2) {
        // 两人比赛
        if (rank === 1) {
          // AK: +200~250分
          ratingDelta = currentRating < 1000 ? 250 : 200;
        } else {
          // 第2: 扣100~150分
          ratingDelta = currentRating < 1000 ? -100 : -150;
        }
        
      } else if (totalParticipants <= 5) {
        // 3-5人比赛（小规模）
        if (rank === 1) {
          // AK: +150~200分
          ratingDelta = currentRating < 1000 ? 200 : 150;
        } else if (rank === 2) {
          // 第2名: +50~100分
          ratingDelta = currentRating < 1000 ? 100 : 50;
        } else if (rank === 3) {
          // 第3名: 0~±50分
          ratingDelta = currentRating < 1000 ? 30 : -30;
        } else {
          // 后几名: 扣分（扣给AK的人）
          ratingDelta = currentRating < 1000 ? -80 : -120;
        }
        
      } else {
        // 6人以上比赛（相对较大规模，接近CF体验）
        // 基于排名的基础分
        const rankPercent = rank / totalParticipants; // 0-1之间
        
        if (rank === 1) {
          // AK: +120~180分
          ratingDelta = currentRating < 1200 ? 180 : 120;
        } else if (rankPercent <= 0.1) {
          // 前10%: +80~100分
          ratingDelta = currentRating < 1200 ? 100 : 80;
        } else if (rankPercent <= 0.25) {
          // 前25%: +40~60分
          ratingDelta = currentRating < 1200 ? 60 : 40;
        } else if (rankPercent <= 0.5) {
          // 前50%: +10~20分
          ratingDelta = currentRating < 1200 ? 20 : 10;
        } else if (rankPercent <= 0.75) {
          // 中间25%: 0~-30分
          ratingDelta = currentRating < 1200 ? -10 : -30;
        } else {
          // 后25%: -50~-100分
          ratingDelta = currentRating < 1200 ? -50 : -100;
        }
      }

      // 新手额外加成（Rating < 800，首次比赛表现好）
      if (currentRating < 800 && rank <= totalParticipants / 2) {
        ratingDelta += 50;
      }

      // Rating不能为负
      const newRating = Math.max(0, currentRating + ratingDelta);

      console.log(`[Rating] User ${userId} (${userNames[userId]}): rating=${currentRating}, rank=${rank}, delta=${ratingDelta}, newRating=${newRating}`);

      ratingChanges[userId] = {
        oldRating: currentRating,
        newRating,
        change: ratingDelta,
        rank,
      };
    }

    // 更新数据库
    const updatePromises = Object.entries(ratingChanges).map(([userId, data]) => {
      return Promise.all([
        client.from("users").update({ rating: data.newRating }).eq("id", parseInt(userId)),
        client.from("rating_history").insert({
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

    await client.from("contests").update({ rating_calculated: true }).eq("id", contestId);

    // 更新cookie
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
