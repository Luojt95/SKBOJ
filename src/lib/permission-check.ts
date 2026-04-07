import { isUserBanned } from "./ban-system";

// 禁言限制的操作类型
export type BannableAction =
  | "benben"      // 发犇犇
  | "message"     // 发私信
  | "discussion"  // 发讨论
  | "share"       // 分享代码
  | "ticket";     // 提交工单

// 检查用户是否可以执行操作（考虑禁言状态）
export async function checkUserCanPerformAction(
  userId: number,
  action: BannableAction
): Promise<{ canPerform: boolean; message?: string }> {
  // 检查是否被禁言
  const banStatus = await isUserBanned(userId);

  if (banStatus.banned) {
    return {
      canPerform: false,
      message: `您已被禁言，无法${getActionName(action)}。原因：${banStatus.reason}`,
    };
  }

  return { canPerform: true };
}

// 获取操作名称
function getActionName(action: BannableAction): string {
  const names: Record<BannableAction, string> = {
    benben: "发布犇犇",
    message: "发送私信",
    discussion: "发布讨论",
    share: "分享代码",
    ticket: "提交工单",
  };
  return names[action];
}
