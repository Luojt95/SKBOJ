import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import bcrypt from "bcryptjs";

// 修改密码
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "请填写旧密码和新密码" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "新密码至少需要6个字符" }, { status: 400 });
    }

    if (oldPassword === newPassword) {
      return NextResponse.json({ error: "新密码不能与旧密码相同" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 获取当前用户信息
    const { data: currentUser } = await client
      .from("users")
      .select("password")
      .eq("id", user.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, currentUser.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "旧密码错误" }, { status: 400 });
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    const { error } = await client
      .from("users")
      .update({ password: hashedNewPassword })
      .eq("id", user.id);

    if (error) {
      console.error("Update password error:", error);
      return NextResponse.json({ error: "修改失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update password error:", error);
    return NextResponse.json({ error: "修改失败" }, { status: 500 });
  }
}
