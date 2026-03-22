import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import bcrypt from "bcryptjs";

// 邀请码配置
const SUPER_ADMIN_CODE = "qwertyuiop11451454188";
const ADMIN_CODE = "321414524";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, adminCode, superAdminCode } = body;

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

    // 确定用户角色
    let role = "user";
    let nameColor = "gray";
    
    if (superAdminCode === SUPER_ADMIN_CODE) {
      role = "super_admin";
      nameColor = "purple";
    } else if (adminCode === ADMIN_CODE) {
      role = "admin";
      nameColor = "purple";
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户（包含所有默认值）
    const { data: user, error } = await client
      .from("users")
      .insert({
        username,
        password: hashedPassword,
        role,
        name_color: nameColor,
        credit_rating: 100,
        problem_rating: 0,
        contest_rating: 0,
        total_rating: 100,
        solved_entry: 0,
        solved_popular_minus: 0,
        solved_popular: 0,
        solved_popular_plus: 0,
        solved_improve_plus: 0,
        solved_provincial: 0,
        solved_noi: 0,
      })
      .select("id, username, role, name_color, created_at")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json(
        { error: "注册失败: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "注册成功",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name_color: user.name_color,
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
