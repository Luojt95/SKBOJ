import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 提醒级别配置
const warningConfig: Record<string, { ratingPenalty: number; restrictions: string[] }> = {
  C: { ratingPenalty: 10, restrictions: [] },
  B: { ratingPenalty: 30, restrictions: [] },
  A: { ratingPenalty: 50, restrictions: ["solutions", "discussions"] },
  S: { ratingPenalty: 100, restrictions: ["solutions", "discussions", "benbens", "messages", "shares"] },
};

// 提醒用户
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const currentUser = JSON.parse(userCookie.value);

    // 只有站长可以提醒用户
    if (currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "只有站长可以提醒用户" }, { status: 403 });
    }

    const body = await request.json();
    const { level, reason } = body;

    if (!level || !["C", "B", "A", "S"].includes(level)) {
      return NextResponse.json({ error: "无效的提醒级别" }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "请填写提醒原因" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 获取目标用户
    const { data: targetUser, error: fetchError } = await client
      .from("users")
      .select("id, username, role, total_rating, warning_level")
      .eq("id", parseInt(id))
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 不能提醒站长
    if (targetUser.role === "super_admin") {
      return NextResponse.json({ error: "不能提醒站长" }, { status: 403 });
    }

    // 不能提醒自己
    if (targetUser.id === currentUser.id) {
      return NextResponse.json({ error: "不能提醒自己" }, { status: 400 });
    }

    const config = warningConfig[level];
    const newRating = Math.max(0, (targetUser.total_rating || 100) - config.ratingPenalty);

    // 更新用户提醒状态
    const { error: updateError } = await client
      .from("users")
      .update({
        warning_level: level,
        warning_reason: reason.trim(),
        warning_at: new Date().toISOString(),
        total_rating: newRating,
        name_color: "gray", // 被提醒后名字变灰色
      })
      .eq("id", parseInt(id));

    if (updateError) {
      console.error("Update warning error:", updateError);
      return NextResponse.json({ error: "提醒失败" }, { status: 500 });
    }

    return NextResponse.json({
      message: `已对用户 ${targetUser.username} 进行 ${level} 级提醒`,
      warning: {
        level,
        reason: reason.trim(),
        ratingPenalty: config.ratingPenalty,
        newRating,
      },
    });
  } catch (error) {
    console.error("Warning user error:", error);
    return NextResponse.json({ error: "提醒失败" }, { status: 500 });
  }
}

// 取消提醒
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const currentUser = JSON.parse(userCookie.value);

    // 只有站长可以取消提醒
    if (currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "只有站长可以取消提醒" }, { status: 403 });
    }

    const client = getSupabaseClient();

    // 获取目标用户
    const { data: targetUser, error: fetchError } = await client
      .from("users")
      .select("id, username, warning_level, total_rating")
      .eq("id", parseInt(id))
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    if (!targetUser.warning_level) {
      return NextResponse.json({ error: "该用户未被提醒" }, { status: 400 });
    }

    // 计算恢复的rating
    const config = warningConfig[targetUser.warning_level];
    const restoredRating = (targetUser.total_rating || 100) + config.ratingPenalty;

    // 取消提醒，恢复用户状态
    const { error: updateError } = await client
      .from("users")
      .update({
        warning_level: null,
        warning_reason: null,
        warning_at: null,
        total_rating: restoredRating,
        // 根据恢复后的rating设置颜色
        name_color: getNameColorByRating(restoredRating),
      })
      .eq("id", parseInt(id));

    if (updateError) {
      console.error("Cancel warning error:", updateError);
      return NextResponse.json({ error: "取消提醒失败" }, { status: 500 });
    }

    return NextResponse.json({
      message: `已取消用户 ${targetUser.username} 的提醒`,
      restoredRating,
    });
  } catch (error) {
    console.error("Cancel warning error:", error);
    return NextResponse.json({ error: "取消提醒失败" }, { status: 500 });
  }
}

// 根据rating获取用户名颜色
function getNameColorByRating(rating: number): string {
  if (rating >= 2600) return "purple";
  if (rating >= 2200) return "red";
  if (rating >= 1800) return "orange";
  if (rating >= 1400) return "green";
  if (rating >= 1000) return "blue";
  return "gray";
}
