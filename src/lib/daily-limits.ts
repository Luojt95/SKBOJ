import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取或初始化每日限制
export async function getDailyLimits(userId: number): Promise<{
  checkedIn: boolean;
  problems_created: number;
  benbens_created: number;
  messages_sent: number;
  contests_created: number;
  discussions_created: number;
  shares_created: number;
  tickets_created: number;
  replies_count: number;
}> {
  const client = getSupabaseClient();

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  const { data: limits } = await client
    .from("daily_limits")
    .select("*")
    .eq("user_id", userId)
    .eq("date", dateStr)
    .single();

  if (!limits) {
    return {
      checkedIn: false,
      problems_created: 0,
      benbens_created: 0,
      messages_sent: 0,
      contests_created: 0,
      discussions_created: 0,
      shares_created: 0,
      tickets_created: 0,
      replies_count: 0,
    };
  }

  return {
    checkedIn: limits.checked_in || false,
    problems_created: limits.problems_created || 0,
    benbens_created: limits.benbens_created || 0,
    messages_sent: limits.messages_sent || 0,
    contests_created: limits.contests_created || 0,
    discussions_created: limits.discussions_created || 0,
    shares_created: limits.shares_created || 0,
    tickets_created: limits.tickets_created || 0,
    replies_count: limits.replies_count || 0,
  };
}

// 检查是否可以执行操作（打卡后才能使用次数）
export async function checkDailyLimit(
  userId: number,
  action: string,
  limit: number
): Promise<{ allowed: boolean; reason?: string }> {
  const client = getSupabaseClient();

  // 获取用户角色
  const { data: user } = await client
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (!user) {
    return { allowed: false, reason: "用户不存在" };
  }

  // 站长无限制
  if (user.role === "super_admin") {
    return { allowed: true };
  }

  // 获取每日限制
  const limits = await getDailyLimits(userId);

  // 未打卡时提示
  if (!limits.checkedIn) {
    return { allowed: false, reason: "请先打卡解锁今日使用次数" };
  }

  // 检查次数
  const currentCount = (limits as any)[action] || 0;
  if (currentCount >= limit) {
    const actionNames: Record<string, string> = {
      problems_created: "创建题目",
      benbens_created: "发布犇犇",
      messages_sent: "发送私信",
      contests_created: "创建比赛",
      discussions_created: "创建讨论",
      shares_created: "分享代码",
      tickets_created: "提交工单",
      replies_count: "回复",
    };
    return {
      allowed: false,
      reason: `今日${actionNames[action] || "此操作"}次数已达上限（${limit}次）`,
    };
  }

  return { allowed: true };
}

// 更新每日限制
export async function updateDailyLimit(userId: number, action: string): Promise<boolean> {
  const client = getSupabaseClient();

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  // 检查是否已存在记录
  const { data: existing } = await client
    .from("daily_limits")
    .select("*")
    .eq("user_id", userId)
    .eq("date", dateStr)
    .single();

  // 统一回复字段名
  const dbAction = action === "replies_created" ? "replies_count" : action;

  if (!existing) {
    // 创建新记录
    const { error } = await client.from("daily_limits").insert({
      user_id: userId,
      date: dateStr,
      checked_in: false,
      [dbAction]: 1,
    });

    return !error;
  }

  // 更新现有记录
  const currentCount = (existing as any)[dbAction] || 0;
  const { error } = await client
    .from("daily_limits")
    .update({
      [dbAction]: currentCount + 1,
    })
    .eq("user_id", userId)
    .eq("date", dateStr);

  return !error;
}

// 重置每日限制（打卡时调用）
export async function resetDailyLimits(userId: number): Promise<boolean> {
  const client = getSupabaseClient();

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  // 检查是否已存在记录
  const { data: existing } = await client
    .from("daily_limits")
    .select("*")
    .eq("user_id", userId)
    .eq("date", dateStr)
    .single();

  if (!existing) {
    // 创建新记录
    const { error } = await client.from("daily_limits").insert({
      user_id: userId,
      date: dateStr,
      checked_in: true,
      problems_created: 0,
      benbens_created: 0,
      messages_created: 0,
      contests_created: 0,
      discussions_created: 0,
      shares_created: 0,
      tickets_created: 0,
      replies_count: 0,
    });

    return !error;
  }

  // 更新现有记录（标记为已打卡，但不清零已使用的次数）
  const { error } = await client
    .from("daily_limits")
    .update({
      checked_in: true,
    })
    .eq("user_id", userId)
    .eq("date", dateStr);

  return !error;
}
