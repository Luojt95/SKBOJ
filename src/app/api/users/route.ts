import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET() {
  try {
    const client = getSupabaseClient();

    // 获取用户列表
    const { data: users, error: usersError } = await client
      .from("users")
      .select("id, username, role, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (usersError) {
      return NextResponse.json({ error: "获取失败" }, { status: 500 });
    }

    // 获取统计数据
    const { count: totalUsers } = await client
      .from("users")
      .select("*", { count: "exact", head: true });

    const { count: totalProblems } = await client
      .from("problems")
      .select("*", { count: "exact", head: true });

    const { count: totalSubmissions } = await client
      .from("submissions")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      users,
      stats: {
        totalUsers: totalUsers || 0,
        totalProblems: totalProblems || 0,
        totalSubmissions: totalSubmissions || 0,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
