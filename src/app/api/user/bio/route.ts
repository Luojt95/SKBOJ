import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 更新个人简介
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    const { bio } = body;

    if (!bio) {
      return NextResponse.json({ error: "个人简介不能为空" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 检查用户是否存在（不查询bio字段以避免schema缓存问题）
    const { data: currentUser } = await client
      .from("users")
      .select("id, username")
      .eq("id", user.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 使用RPC函数绕过schema缓存
    const { data, error } = await client.rpc('update_user_bio', {
      user_id: user.id,
      new_bio: bio
    });

    if (error) {
      console.error("Update bio error:", error);
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    // 更新cookie
    cookieStore.set(
      "user",
      JSON.stringify({
        ...user,
        bio,
      }),
      {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update bio error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
