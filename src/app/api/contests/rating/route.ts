import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

/**
 * SKBOJ Rating 计算系统
 * 
 * Div难度等级（从难到易）：
 * - Div.1: 最难，高手专场，AK +100~200
 * - Div.2: 中等，进阶选手，AK +200~400
 * - Div.3: 入门，新手友好，AK +300~500
 * - Div.4: Unrated（不计算Rating）
 * 
 * 首战加成：
 * - 无论排名如何，首战基础+100分
 * - 表现好的首战可以+500~1000+
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

    // Div.4 不计算 Rating
    if (contest.div === "Div.4") {
      return NextResponse.json({ 
        error: "Div.4 不计入 Rating",
        message: "Div.4 比赛不会影响参赛者的 Rating"
      }, { status: 400 });
    }

    const { data: currentUser } = await client
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
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

    // 检查用户是否是首战（没有其他参赛记录）
    const { data: allUserContests } = await client
      .from("contest_participants")
      .select("id")
      .in("user_id", userIds);
    
    const userContestCount: Record<number, number> = {};
    allUserContests?.forEach((p: any) => {
      userContestCount[p.user_id] = (userContestCount[p.user_id] || 0) + 1;
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
    const div = contest.div || "Div.2"; // 默认Div.2

    console.log(`[Rating] Contest ${contestId}, Div: ${div}, ${totalParticipants} participants`);

    const ratingChanges: Record<number, { 
      oldRating: number; 
      newRating: number; 
      change: number; 
      rank: number;
    }> = {};

    for (const participant of sortedParticipants) {
      const userId = participant.user_id;
      const currentRating = userRatings[userId] || 0;
      const rank = participant.rank;
      const score = participant.score || 0;
      const isFirstContest = (userContestCount[userId] || 0) <= 1;
      const rankPercent = rank / totalParticipants;

      let ratingDelta = 0;

      // ============ 首战加成 ============
      // Div.1最难，首战加成最高；Div.3最简单，首战加成最少
      if (isFirstContest) {
        // 首战基础加分：无论排名如何，至少+50分
        ratingDelta += 50;
        
        // 首战表现加分（Div.1 > Div.2 > Div.3）
        if (rank === 1) {
          // 首战AK：额外+500~1500分（视Div难度）
          if (div === "Div.1") ratingDelta += 1500;
          else if (div === "Div.2") ratingDelta += 700;
          else ratingDelta += 500;
        } else if (rankPercent <= 0.25) {
          // 首战前25%：额外+400~1000分
          if (div === "Div.1") ratingDelta += 1000;
          else if (div === "Div.2") ratingDelta += 500;
          else ratingDelta += 400;
        } else if (rankPercent <= 0.5) {
          // 首战前50%：额外+200~500分
          if (div === "Div.1") ratingDelta += 500;
          else if (div === "Div.2") ratingDelta += 300;
          else ratingDelta += 200;
        } else {
          // 首战后50%：额外+50~200分
          if (div === "Div.1") ratingDelta += 200;
          else if (div === "Div.2") ratingDelta += 100;
          else ratingDelta += 50;
        }
      } else {
        // 非首战，根据Div和排名计算
        // Div.1最难，AK加分最多；Div.3最简单，AK加分最少
        if (totalParticipants === 1) {
          // 单人比赛（AK）
          if (div === "Div.1") ratingDelta = currentRating < 1500 ? 1500 : 1000;
          else if (div === "Div.2") ratingDelta = currentRating < 1500 ? 700 : 500;
          else ratingDelta = currentRating < 1500 ? 500 : 300;
        } else if (rank === 1) {
          // AK
          if (div === "Div.1") {
            ratingDelta = currentRating < 1500 ? 1500 : 1000;
          } else if (div === "Div.2") {
            ratingDelta = currentRating < 1500 ? 700 : 500;
          } else {
            ratingDelta = currentRating < 1500 ? 500 : 300;
          }
        } else if (rankPercent <= 0.1) {
          // 前10%
          if (div === "Div.1") ratingDelta = currentRating < 1500 ? 600 : 400;
          else if (div === "Div.2") ratingDelta = currentRating < 1500 ? 350 : 250;
          else ratingDelta = currentRating < 1500 ? 250 : 150;
        } else if (rankPercent <= 0.25) {
          // 前25%
          if (div === "Div.1") ratingDelta = currentRating < 1500 ? 300 : 200;
          else if (div === "Div.2") ratingDelta = currentRating < 1500 ? 200 : 120;
          else ratingDelta = currentRating < 1500 ? 150 : 80;
        } else if (rankPercent <= 0.5) {
          // 前50%
          if (div === "Div.1") ratingDelta = currentRating < 1500 ? 100 : 50;
          else if (div === "Div.2") ratingDelta = currentRating < 1500 ? 80 : 30;
          else ratingDelta = currentRating < 1500 ? 50 : 0;
        } else if (rankPercent <= 0.75) {
          // 中间25%：扣分
          if (div === "Div.1") ratingDelta = currentRating < 1500 ? -200 : -350;
          else if (div === "Div.2") ratingDelta = currentRating < 1500 ? -150 : -250;
          else ratingDelta = currentRating < 1500 ? -100 : -180;
        } else {
          // 后25%：大扣分
          if (div === "Div.1") ratingDelta = currentRating < 1500 ? -400 : -600;
          else if (div === "Div.2") ratingDelta = currentRating < 1500 ? -300 : -450;
          else ratingDelta = currentRating < 1500 ? -200 : -350;
        }
      }

      // 新手保护：Rating < 800 额外加分
      if (currentRating < 800 && ratingDelta > 0) {
        ratingDelta += 50;
      }

      const newRating = Math.max(0, currentRating + ratingDelta);

      console.log(`[Rating] User ${userId} (${userNames[userId]}): rating=${currentRating}, rank=${rank}, isFirst=${isFirstContest}, delta=${ratingDelta}, newRating=${newRating}`);

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
      message: `已为 ${sortedParticipants.length} 位参赛者计算 Rating（${div}）`,
      data: {
        totalParticipants: sortedParticipants.length,
        div,
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
