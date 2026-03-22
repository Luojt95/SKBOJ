import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { loginUserSchema } from "@/storage/database/shared/schema";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginUserSchema.parse(body);

    const client = getSupabaseClient();

    // 查找用户
    const { data: user, error } = await client
      .from("users")
      .select("id, username, password, role, name_color, created_at")
      .eq("username", validatedData.username)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(
      validatedData.password,
      user.password
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 设置cookie
    const cookieStore = await cookies();
    cookieStore.set(
      "user",
      JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role,
        name_color: user.name_color,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7天
      }
    );

    return NextResponse.json({
      message: "登录成功",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name_color: user.name_color,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "登录失败" },
      { status: 400 }
    );
  }
}
