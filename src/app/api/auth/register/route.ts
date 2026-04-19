import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import bcrypt from "bcryptjs";
import { verifyCaptchaAnswer } from "@/app/api/captcha/route";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, captchaToken, captchaAnswer } = body;

    // 验证验证码
    if (!captchaToken || !captchaAnswer) {
      return NextResponse.json(
        { error: "请输入验证码" },
        { status: 400 }
      );
    }

    if (!verifyCaptchaAnswer(captchaToken, captchaAnswer)) {
      return NextResponse.json(
        { error: "验证码错误或已过期" },
        { status: 400 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { error: "用户名需要3-50个字符" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要6个字符" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 检查用户名是否已存在
    const { data: existingUser } = await client
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 400 }
      );
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户（默认为普通用户，初始Rating为0）
    const now = new Date().toISOString();
    const { data: user, error } = await client
      .from("users")
      .insert({
        username,
        password: hashedPassword,
        role: "user",
        name_color: "gray",
        rating: 0, // 新用户初始Rating为0
        solved_entry: 0,
        solved_popular_minus: 0,
        solved_popular: 0,
        solved_popular_plus: 0,
        solved_improve_plus: 0,
        solved_provincial: 0,
        solved_noi: 0,
        last_login: now, // 注册时也设置 last_login
      })
      .select("id, username, role, name_color, created_at, rating")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json(
        { error: "注册失败: " + error.message },
        { status: 500 }
      );
    }

    // 设置cookie实现自动登录
    const cookieStore = await cookies();
    cookieStore.set(
      "user",
      JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role,
        rating: user.rating,
        lastLogin: now,
      }),
      {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      }
    );

    return NextResponse.json({
      message: "注册成功",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name_color: user.name_color,
        lastLogin: now,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "注册失败: " + (error as Error).message },
      { status: 500 }
    );
  }
}
