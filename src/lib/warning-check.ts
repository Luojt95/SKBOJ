import { getSupabaseClient } from "@/storage/database/supabase-client";
import { checkPoints, deductPoints, POINTS_COST } from "./points-system";

// 检查用户是否有足够的积分发布内容
export async function checkUserPoints(
  userId: number,
  action: "solutions" | "discussions" | "benbens" | "messages" | "benben_reply" | "discussion_reply"
): Promise<{ allowed: boolean; reason?: string; cost?: number }> {
  // 获取所需积分
  let requiredPoints = 0;
  switch (action) {
    case "benbens":
      requiredPoints = Math.abs(POINTS_COST.BENBEN);
      break;
    case "messages":
      requiredPoints = Math.abs(POINTS_COST.MESSAGE);
      break;
    case "benben_reply":
      requiredPoints = Math.abs(POINTS_COST.BENBEN_REPLY);
      break;
    case "discussion_reply":
      requiredPoints = Math.abs(POINTS_COST.DISCUSSION_REPLY);
      break;
    case "discussions":
      requiredPoints = Math.abs(POINTS_COST.DISCUSSION);
      break;
    case "solutions":
      requiredPoints = 0; // 题解不需要积分
      break;
    default:
      requiredPoints = 0;
  }

  // 如果不需要积分，直接返回允许
  if (requiredPoints === 0) {
    return { allowed: true, cost: 0 };
  }

  // 检查积分
  const result = await checkPoints(userId, requiredPoints);
  
  if (!result.sufficient) {
    return {
      allowed: false,
      reason: result.message || `积分不足，需要 ${requiredPoints} 积分`,
      cost: requiredPoints,
    };
  }

  return { allowed: true, cost: requiredPoints };
}

// 扣减用户积分
export async function deductUserPoints(
  userId: number,
  action: "solutions" | "discussions" | "benbens" | "messages" | "benben_reply" | "discussion_reply",
  relatedId?: number
): Promise<boolean> {
  let amount = 0;
  let reason = "";
  let relatedType = "";

  switch (action) {
    case "benbens":
      amount = POINTS_COST.BENBEN;
      reason = "发送犇犇";
      relatedType = "benben";
      break;
    case "messages":
      amount = POINTS_COST.MESSAGE;
      reason = "发送私信";
      relatedType = "message";
      break;
    case "benben_reply":
      amount = POINTS_COST.BENBEN_REPLY;
      reason = "回复犇犇";
      relatedType = "benben";
      break;
    case "discussion_reply":
      amount = POINTS_COST.DISCUSSION_REPLY;
      reason = "回复讨论";
      relatedType = "discussion";
      break;
    case "discussions":
      amount = POINTS_COST.DISCUSSION;
      reason = "发布讨论";
      relatedType = "discussion";
      break;
    default:
      return true;
  }

  return await deductPoints(userId, amount, reason, relatedType, relatedId);
}
