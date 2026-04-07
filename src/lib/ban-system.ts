import { getSupabaseClient } from "@/storage/database/supabase-client";

// 检查用户是否被禁言
export async function isUserBanned(userId: number): Promise<{
  banned: boolean;
  reason?: string;
}> {
  const client = getSupabaseClient();

  const { data: user } = await client
    .from("users")
    .select("is_banned, ban_reason")
    .eq("id", userId)
    .single();

  if (!user) {
    return { banned: false };
  }

  return {
    banned: user.is_banned || false,
    reason: user.ban_reason || undefined,
  };
}

// 禁言用户（只有站长可以执行）
export async function banUser(
  operatorId: number,
  targetUserId: number,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();

  // 检查操作者是否是站长
  const { data: operator } = await client
    .from("users")
    .select("role")
    .eq("id", operatorId)
    .single();

  if (!operator || operator.role !== "super_admin") {
    return { success: false, message: "只有站长可以禁言用户" };
  }

  // 不能禁言自己
  if (operatorId === targetUserId) {
    return { success: false, message: "不能禁言自己" };
  }

  // 不能禁言其他站长
  const { data: targetUser } = await client
    .from("users")
    .select("role")
    .eq("id", targetUserId)
    .single();

  if (!targetUser) {
    return { success: false, message: "目标用户不存在" };
  }

  if (targetUser.role === "super_admin") {
    return { success: false, message: "不能禁言站长" };
  }

  // 禁言用户：积分清零、权限改为普通用户、设置禁言状态
  const { error } = await client
    .from("users")
    .update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      ban_reason: reason,
      role: "user",  // 权限降级为普通用户
      points: 0,    // 积分清零
    })
    .eq("id", targetUserId);

  if (error) {
    return { success: false, message: "禁言失败" };
  }

  return { success: true, message: "已禁言该用户" };
}

// 解禁用户（只有站长可以执行）
export async function unbanUser(
  operatorId: number,
  targetUserId: number
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();

  // 检查操作者是否是站长
  const { data: operator } = await client
    .from("users")
    .select("role")
    .eq("id", operatorId)
    .single();

  if (!operator || operator.role !== "super_admin") {
    return { success: false, message: "只有站长可以解禁用户" };
  }

  // 解禁用户
  const { error } = await client
    .from("users")
    .update({
      is_banned: false,
      banned_at: null,
      ban_reason: null,
    })
    .eq("id", targetUserId);

  if (error) {
    return { success: false, message: "解禁失败" };
  }

  return { success: true, message: "已解禁该用户" };
}
