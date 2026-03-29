import { getSupabaseClient } from "@/storage/database/supabase-client";

// 提醒级别对应的限制
const warningRestrictions: Record<string, string[]> = {
  C: [],
  B: [],
  A: ["solutions", "discussions"],
  S: ["solutions", "discussions", "benbens", "messages", "shares"],
};

export interface UserWarningInfo {
  hasWarning: boolean;
  level: string | null;
  restrictions: string[];
}

// 检查用户是否有发布某类内容的权限
export async function checkUserPermission(
  userId: number,
  action: "solutions" | "discussions" | "benbens" | "messages" | "shares"
): Promise<{ allowed: boolean; reason?: string }> {
  const client = getSupabaseClient();

  const { data: user, error } = await client
    .from("users")
    .select("warning_level, role")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return { allowed: false, reason: "用户不存在" };
  }

  // 管理员和站长不受限制
  if (user.role === "admin" || user.role === "super_admin") {
    return { allowed: true };
  }

  const warningLevel = user.warning_level as string | null;

  if (!warningLevel) {
    return { allowed: true };
  }

  const restrictions = warningRestrictions[warningLevel] || [];

  if (restrictions.includes(action)) {
    const levelLabels: Record<string, string> = {
      A: "A级提醒",
      S: "S级提醒",
    };
    return {
      allowed: false,
      reason: `您已被${levelLabels[warningLevel] || "提醒"}，暂时无法发布此类内容`,
    };
  }

  return { allowed: true };
}

// 获取用户提醒信息
export async function getUserWarningInfo(userId: number): Promise<UserWarningInfo> {
  const client = getSupabaseClient();

  const { data: user, error } = await client
    .from("users")
    .select("warning_level")
    .eq("id", userId)
    .single();

  if (error || !user || !user.warning_level) {
    return { hasWarning: false, level: null, restrictions: [] };
  }

  const level = user.warning_level as string;
  return {
    hasWarning: true,
    level,
    restrictions: warningRestrictions[level] || [],
  };
}
