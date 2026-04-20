import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

/**
 * Codeforces 风格 Rating 计算系统
 * 
 * 算法要点：
 * - 实际得分 S_act = N - rank
 * - 期望得分 S_exp = Σ 1/(1 + 10^((Rj - Ri)/400))
 * - K(p) = 50 + 130 * e^(-p/4)，p为已赛场次
 * - Δ_raw = K(p) * (S_act - S_exp) / (N-1)
 * - 保底机制：排名前2且Δ_raw < K(p)*0.12时强制Δ_raw = K(p)*0.12
 * - 非对称修正：低分段只加不减，高分段加分难扣分狠
 * - 扣分减速：超过-400时平方根衰减
 * - 难度系数：Div1=1.1, Div2=1.0, Div3=0.9, Div4不更新
 */

// 难度系数
function getDivCoefficient(div: string | null): number {
  if (div === "Div.1") return 1.1;
  if (div === "Div.2") return 1.0;
  if (div === "Div.3") return 0.9;
  return 1.0; // 默认
}

// 计算K因子，p为已赛场次
function getKFactor(contestsParticipated: number): number {
  return 50 + 130 * Math.exp(-contestsParticipated / 4);
}

// 计算期望得分（对所有其他对手，排除自己）
function calculateExpectedScore(myRating: number, myId: number, allRatings: { id: number; rating: number }[]): number {
  let sum = 0;
  for (const r of allRatings) {
    if (r.id !== myId) { // 排除自己
      sum += 1 / (1 + Math.pow(10, (r.rating - myRating) / 400));
    }
  }
  return sum;
}

// 非对称修正
function applyAsymmetricCorrection(delta: number, currentRating: number, divCoeff: number): number {
  const d = divCoeff;

  if (currentRating < 800) {
    // 低分段：只加不减
    if (delta > 0) {
      return delta * (1 + (800 - currentRating) / 150) * d;
    }
    return 0;
  } else if (currentRating < 1900) {
    // 中分段
    if (delta > 0) {
      // 加分高倍率
      return delta * (1 + (1900 - currentRating) / 150) * d;
    } else {
      // 减分平方加速（缓和）
      return delta * (1 + Math.pow((currentRating - 800) / 500, 2)) / d;
    }
  } else {
    // 高分段
    if (delta > 0) {
      // 加分阻尼
      return delta / (1 + Math.pow((currentRating - 1900) / 400, 2)) * d;
    } else {
      // 减分立方加速
      return delta * (5.84 + Math.pow((currentRating - 1900) / 150, 3)) / d;
    }
  }
}

// 扣分减速：超过-400时平方根衰减
function applyDecayLimit(delta: number): number {
  if (delta < -400) {
    return -(400 + Math.sqrt(Math.abs(delta) - 400));
  }
  return delta;
}

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

    // Div.4 不计算 Rating
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

    if (participantsError || !participants || participants.length === 0) {
      return NextResponse.json({ error: "没有参赛记录" }, { status: 400 });
    }

    const userIds = participants.map((p: any) => p.user_id);
    console.log(`[Rating] UserIds: ${userIds}`);
    
    const { data: users, error: usersError } = await client
      .from("users")
      .select("id, username, rating, contests_participated")
      .in("id", userIds);

    console.log(`[Rating] Found users: ${users?.length}, error: ${usersError}`);
    console.log(`[Rating] Users:`, users?.map(u => ({id: u.id, username: u.username, rating: u.rating})));

    if (usersError) {
      return NextResponse.json({ error: "获取用户信息失败" }, { status: 500 });
    }

    // 建立用户映射
    const userMap: Record<number, any> = {};
    users?.forEach((u: any) => {
      userMap[u.id] = {
        ...u,
        rating: u.rating || 0,
        contestsParticipated: u.contests_participated || 0
      };
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

    const N = sortedParticipants.length;
    const divCoeff = getDivCoefficient(contest.div);

    console.log(`[Rating] Contest ${contestId}, Div: ${contest.div}, d=${divCoeff}, N=${N}`);

    // 构建所有用户Rating数组（用于计算期望得分）
    const allRatings = Object.values(userMap).map(u => ({ id: u.id, rating: u.rating }));

    const ratingChanges: Record<number, { 
      oldRating: number; 
      newRating: number; 
      change: number; 
      rank: number;
      sAct: number;
      sExp: number;
      k: number;
      deltaRaw: number;
    }> = {};

    for (const participant of sortedParticipants) {
      const userId = participant.user_id;
      const userInfo = userMap[userId];
      const currentRating = userInfo.rating;
      const rank = participant.rank;
      const contestsParticipated = userInfo.contestsParticipated;

      // 1. 实际得分 S_act = N - rank
      const sAct = N - rank;

      // 2. 期望得分 S_exp
      const sExp = calculateExpectedScore(currentRating, userId, allRatings);

      // 3. K因子
      const k = getKFactor(contestsParticipated);

      // 4. 基础变化量
      let deltaRaw = k * (sAct - sExp) / (N - 1);

      // 5. 保底机制（仅排名前2且deltaRaw < K * 0.12）
      if ((rank === 1 || rank === 2) && deltaRaw < k * 0.12) {
        deltaRaw = k * 0.12;
        console.log(`[Rating] User ${userId}: 保底机制触发`);
      }

      // 6. 非对称修正
      let delta = applyAsymmetricCorrection(deltaRaw, currentRating, divCoeff);

      // 7. 扣分减速
      delta = applyDecayLimit(delta);

      // 8. 取整
      const ratingDelta = Math.round(delta);
      const newRating = Math.max(0, currentRating + ratingDelta);

      console.log(`[Rating] User ${userId} (${userInfo.username}): rating=${currentRating}, rank=${rank}, S_act=${sAct}, S_exp=${sExp.toFixed(2)}, k=${k.toFixed(1)}, delta_raw=${deltaRaw.toFixed(2)}, delta=${ratingDelta}, newRating=${newRating}`);

      ratingChanges[userId] = {
        oldRating: currentRating,
        newRating,
        change: ratingDelta,
        rank,
        sAct,
        sExp,
        k,
        deltaRaw
      };
    }

    // 更新数据库
    const updatePromises = Object.entries(ratingChanges).map(([userId, data]) => {
      return Promise.all([
        // 更新用户Rating和已赛场次
        client.from("users").update({ 
          rating: data.newRating,
          contests_participated: (userMap[parseInt(userId)].contestsParticipated || 0) + 1
        }).eq("id", parseInt(userId)),
        // 记录Rating历史
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

    // 标记比赛已计算Rating
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
      message: `已为 ${N} 位参赛者计算 Rating（${contest.div}）`,
      data: {
        totalParticipants: N,
        div: contest.div,
        divCoefficient: divCoeff,
        changes: Object.entries(ratingChanges).map(([userId, data]) => ({
          userId: parseInt(userId),
          username: userMap[parseInt(userId)]?.username,
          ...data,
        })),
      },
    });
  } catch (error) {
    console.error("Calculate rating error:", error);
    return NextResponse.json({ error: "计算 Rating 失败" }, { status: 500 });
  }
}
