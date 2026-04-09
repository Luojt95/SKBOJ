import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { banUser, unbanUser, isUserBanned } from "@/lib/ban-system";

// GET - 检查用户是否被禁言
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    const result = await isUserBanned(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("检查禁言状态失败:", error);
    return NextResponse.json({ error: "检查禁言状态失败" }, { status: 500 });
  }
}

// POST - 禁言用户（仅站长）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const currentUser = JSON.parse(userCookie.value);

    if (currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await params;
    const targetUserId = parseInt(id);

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: "请提供禁言原因" }, { status: 400 });
    }

    const result = await banUser(currentUser.id, targetUserId, reason.trim());

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error("禁言用户失败:", error);
    return NextResponse.json({ error: "禁言用户失败" }, { status: 500 });
  }
}

// DELETE - 解禁用户（仅站长）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const currentUser = JSON.parse(userCookie.value);

    if (currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = await params;
    const targetUserId = parseInt(id);

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    const result = await unbanUser(currentUser.id, targetUserId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error("解禁用户失败:", error);
    return NextResponse.json({ error: "解禁用户失败" }, { status: 500 });
  }
}
