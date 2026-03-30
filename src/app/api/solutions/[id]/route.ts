import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { addPoints, POINTS_REWARD } from "@/lib/points-system";

// 审核题解（管理员）
export async function PATCH(
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

    const user = JSON.parse(userCookie.value);

    // 只有管理员和站长可以审核
    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body; // approved 或 rejected

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "无效的状态" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 检查题解是否存在
    const { data: solution, error: findError } = await client
      .from("solutions")
      .select("id, status, user_id")
      .eq("id", parseInt(id))
      .single();

    if (findError || !solution) {
      return NextResponse.json({ error: "题解不存在" }, { status: 404 });
    }

    // 检查是否是从pending变为approved
    const wasPending = solution.status === "pending";
    const isNowApproved = status === "approved";

    // 更新状态
    const { error } = await client
      .from("solutions")
      .update({ 
        status,
        updated_at: new Date().toISOString() 
      })
      .eq("id", parseInt(id));

    if (error) {
      return NextResponse.json({ error: "审核失败" }, { status: 500 });
    }

    // 如果题解通过，给用户增加积分
    if (wasPending && isNowApproved) {
      await addPoints(
        solution.user_id,
        POINTS_REWARD.SOLUTION_APPROVED,
        "题解审核通过",
        "solution",
        solution.id
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: status === "approved" ? "题解已通过" : "题解已拒绝" 
    });
  } catch (error) {
    console.error("Review solution error:", error);
    return NextResponse.json({ error: "审核失败" }, { status: 500 });
  }
}

// 删除题解
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

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();

    // 获取题解信息
    const { data: solution, error: findError } = await client
      .from("solutions")
      .select("id, user_id")
      .eq("id", parseInt(id))
      .single();

    if (findError || !solution) {
      return NextResponse.json({ error: "题解不存在" }, { status: 404 });
    }

    // 只有作者、管理员和站长可以删除
    if (solution.user_id !== user.id && user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const { error } = await client
      .from("solutions")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete solution error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
