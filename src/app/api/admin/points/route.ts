import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 站长调整用户积分
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);

    // 只有站长可以调整积分
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, change, reason } = body;

    if (!userId || change === undefined || change === null) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 获取目标用户
    const { data: targetUser, error: findError } = await client
      .from("users")
      .select("id, username, points")
      .eq("id", userId)
      .single();

    if (findError || !targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 计算新积分（不能为负）
    const newPoints = Math.max(0, (targetUser.points || 0) + parseInt(change));

    // 更新积分
    const { error } = await client
      .from("users")
      .update({ points: newPoints })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: "调整失败" }, { status: 500 });
    }

    // 记录积分变动
    await client.from("points_history").insert({
      user_id: userId,
      change: parseInt(change),
      reason: reason || `站长调整积分`,
      related_type: "admin_adjust",
    });

    // 给用户发送通知
    await client.from("notifications").insert({
      user_id: userId,
      type: "points_adjust",
      title: "积分变动",
      content: `站长调整了您的积分：${parseInt(change) > 0 ? "+" : ""}${change}，原因：${reason || "无"}`,
      related_type: "points",
    });

    return NextResponse.json({
      success: true,
      message: "积分调整成功",
      newPoints,
    });
  } catch (error) {
    console.error("Adjust points error:", error);
    return NextResponse.json({ error: "调整失败" }, { status: 500 });
  }
}
