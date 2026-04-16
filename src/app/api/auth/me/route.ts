import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    
    // 从数据库获取完整用户信息（包括头像）
    const client = getSupabaseClient();
    const { data: fullUser, error } = await client
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !fullUser) {
      return NextResponse.json({ user });
    }

    // 返回完整用户信息
    return NextResponse.json({
      user: {
        id: fullUser.id,
        username: fullUser.username,
        role: fullUser.role,
        rating: fullUser.rating,
        points: fullUser.points,
        avatar: fullUser.avatar,
        bio: fullUser.bio,
        lastLogin: user.lastLogin,
      }
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
