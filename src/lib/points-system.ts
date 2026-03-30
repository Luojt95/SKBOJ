import { getSupabaseClient } from "@/storage/database/supabase-client";

// 积分消耗配置
export const POINTS_COST = {
  BENBEN: -3,          // 发送犇犇
  MESSAGE: -2,         // 发送私信
  BENBEN_REPLY: -2,    // 回复犇犇
  DISCUSSION_REPLY: -2, // 回复讨论
  DISCUSSION: -20,     // 发布讨论
};

// 积分奖励配置
export const POINTS_REWARD = {
  CHECK_IN: 10,        // 每日签到
  SOLUTION_APPROVED: 10, // 题解通过
  BECOME_ADMIN: 50,    // 成为管理员
};

// 获取用户积分（站长返回Infinity）
export async function getUserPoints(userId: number): Promise<number> {
  const client = getSupabaseClient();
  
  const { data: user, error } = await client
    .from("users")
    .select("points, role")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return 0;
  }

  // 站长拥有无限积分
  if (user.role === "super_admin") {
    return Infinity;
  }

  return user.points || 0;
}

// 检查用户是否有足够积分
export async function checkPoints(
  userId: number,
  requiredPoints: number
): Promise<{ sufficient: boolean; current: number; message?: string }> {
  const points = await getUserPoints(userId);
  
  // 站长无限积分
  if (points === Infinity) {
    return { sufficient: true, current: Infinity };
  }

  if (points < Math.abs(requiredPoints)) {
    return {
      sufficient: false,
      current: points,
      message: `积分不足，需要 ${Math.abs(requiredPoints)} 积分，当前 ${points} 积分`,
    };
  }

  return { sufficient: true, current: points };
}

// 扣减积分
export async function deductPoints(
  userId: number,
  amount: number,
  reason: string,
  relatedType?: string,
  relatedId?: number
): Promise<boolean> {
  const client = getSupabaseClient();

  // 检查用户是否是站长
  const { data: user } = await client
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (user?.role === "super_admin") {
    return true; // 站长不扣积分
  }

  // 扣减积分
  const { error: updateError } = await client
    .rpc("deduct_points", {
      user_id: userId,
      amount: Math.abs(amount),
    });

  if (updateError) {
    // 如果没有rpc函数，使用普通更新
    const { data: currentUser } = await client
      .from("users")
      .select("points")
      .eq("id", userId)
      .single();

    if (!currentUser) return false;

    const newPoints = (currentUser.points || 0) - Math.abs(amount);

    const { error } = await client
      .from("users")
      .update({ points: Math.max(0, newPoints) })
      .eq("id", userId);

    if (error) return false;
  }

  // 记录积分变动历史
  await client.from("points_history").insert({
    user_id: userId,
    change: -Math.abs(amount),
    reason,
    related_type: relatedType,
    related_id: relatedId,
  });

  return true;
}

// 增加积分
export async function addPoints(
  userId: number,
  amount: number,
  reason: string,
  relatedType?: string,
  relatedId?: number
): Promise<boolean> {
  const client = getSupabaseClient();

  // 增加积分
  const { data: currentUser } = await client
    .from("users")
    .select("points")
    .eq("id", userId)
    .single();

  if (!currentUser) return false;

  const newPoints = (currentUser.points || 0) + Math.abs(amount);

  const { error } = await client
    .from("users")
    .update({ points: newPoints })
    .eq("id", userId);

  if (error) return false;

  // 记录积分变动历史
  await client.from("points_history").insert({
    user_id: userId,
    change: Math.abs(amount),
    reason,
    related_type: relatedType,
    related_id: relatedId,
  });

  return true;
}

// 检查今日是否已签到
export async function hasCheckedInToday(userId: number): Promise<boolean> {
  const client = getSupabaseClient();

  const { data: user } = await client
    .from("users")
    .select("last_check_in")
    .eq("id", userId)
    .single();

  if (!user || !user.last_check_in) {
    return false;
  }

  const lastCheckIn = new Date(user.last_check_in);
  const today = new Date();
  
  return (
    lastCheckIn.getFullYear() === today.getFullYear() &&
    lastCheckIn.getMonth() === today.getMonth() &&
    lastCheckIn.getDate() === today.getDate()
  );
}

// 签到
export async function checkIn(userId: number): Promise<{ success: boolean; message: string; points?: number }> {
  // 检查是否已签到
  const alreadyCheckedIn = await hasCheckedInToday(userId);
  if (alreadyCheckedIn) {
    return { success: false, message: "今日已签到" };
  }

  const client = getSupabaseClient();

  // 更新签到时间和积分
  const { data: user } = await client
    .from("users")
    .select("points")
    .eq("id", userId)
    .single();

  if (!user) {
    return { success: false, message: "用户不存在" };
  }

  const newPoints = (user.points || 0) + POINTS_REWARD.CHECK_IN;

  const { error } = await client
    .from("users")
    .update({
      points: newPoints,
      last_check_in: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { success: false, message: "签到失败" };
  }

  // 记录积分变动
  await client.from("points_history").insert({
    user_id: userId,
    change: POINTS_REWARD.CHECK_IN,
    reason: "每日签到",
    related_type: "check_in",
  });

  return { 
    success: true, 
    message: `签到成功，获得 ${POINTS_REWARD.CHECK_IN} 积分`,
    points: newPoints 
  };
}

// 获取积分历史
export async function getPointsHistory(
  userId: number,
  limit: number = 20
): Promise<any[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("points_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return data || [];
}

// 根据积分获取用户名颜色
export function getPointsColor(points: number, role?: string): string {
  // 站长和管理员紫色
  if (role === "super_admin" || role === "admin") {
    return "text-purple-500";
  }

  // 根据积分确定颜色
  if (points <= 0) return "text-gray-500";        // 0积分：灰色
  if (points <= 10) return "text-sky-400";        // 1-10：浅蓝色
  if (points <= 20) return "text-blue-600";       // 10-20：深蓝色
  if (points <= 50) return "text-green-500";      // 21-50：绿色
  if (points <= 100) return "text-yellow-500";    // 50-100：黄色
  if (points <= 200) return "text-orange-500";    // 100-200：橙色
  if (points <= 500) return "text-red-500";       // 200-500：红色
  return "text-amber-400";                        // 500+：亮金色
}

// 获取积分等级名称
export function getPointsTitle(points: number, role?: string): string {
  if (role === "super_admin") return "站长";
  if (role === "admin") return "管理员";
  
  if (points <= 0) return "新手";
  if (points <= 10) return "入门";
  if (points <= 20) return "初级";
  if (points <= 50) return "中级";
  if (points <= 100) return "高级";
  if (points <= 200) return "专家";
  if (points <= 500) return "大师";
  return "传奇";
}
