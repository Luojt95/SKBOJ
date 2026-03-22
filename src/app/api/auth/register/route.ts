import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { registerUserSchema } from "@/storage/database/shared/schema";
import bcrypt from "bcryptjs";

// 邀请码配置（不对外显示）
const SUPER_ADMIN_CODE = "qwertyuiop11451454188";
const ADMIN_CODE = "321414524";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerUserSchema.parse(body);

    const client = getSupabaseClient();

    // 检查用户名是否已存在
    const { data: existingUser } = await client
      .from("users")
      .select("id")
      .eq("username", validatedData.username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 400 }
      );
    }

    // 确定用户角色
    let role = "user";
    if (validatedData.superAdminCode === SUPER_ADMIN_CODE) {
      role = "super_admin";
    } else if (validatedData.adminCode === ADMIN_CODE) {
      role = "admin";
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // 创建用户
    const { data: user, error } = await client
      .from("users")
      .insert({
        username: validatedData.username,
        password: hashedPassword,
        role: role,
      })
      .select("id, username, role, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "注册失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "注册成功",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "注册失败，请检查输入" },
      { status: 400 }
    );
  }
}
