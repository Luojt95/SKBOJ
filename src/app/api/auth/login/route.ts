import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 查找用户
    const { data: users, error } = await client
      .from("users")
      .select("id, username, password, role, name_color")
      .eq("username", username);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "数据库查询失败" },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const user = users[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);

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
        name_color: user.name_color || "gray",
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
      message: "登录成功",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name_color: user.name_color || "gray",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "登录失败" },
      { status: 500 }
    );
  }
}
