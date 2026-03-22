import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET() {
  try {
    const client = getSupabaseClient();

    // 获取用户列表 - 先查询基本字段，再尝试获取扩展字段
    const { data: users, error: usersError } = await client
      .from("users")
      .select("id, username, role, created_at, name_color, total_rating, solved_easy, solved_medium, solved_hard")
      .order("created_at", { ascending: false })
      .limit(100);

    if (usersError) {
      console.error("Users query error:", usersError);
      // 如果扩展字段不存在，尝试查询基本字段
      const { data: basicUsers, error: basicError } = await client
        .from("users")
        .select("id, username, role, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (basicError) {
        console.error("Basic users query error:", basicError);
        return NextResponse.json({ error: "获取失败" }, { status: 500 });
      }

      // 为基本用户添加默认值
      const usersWithDefaults = (basicUsers || []).map(u => ({
        ...u,
        name_color: "gray",
        total_rating: 100,
        solved_easy: 0,
        solved_medium: 0,
        solved_hard: 0,
      }));

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
        users: usersWithDefaults,
        stats: {
          totalUsers: totalUsers || 0,
          totalProblems: totalProblems || 0,
          totalSubmissions: totalSubmissions || 0,
        },
      });
    }

    // 为用户添加默认值（如果字段为null）
    const usersWithDefaults = (users || []).map(u => ({
      ...u,
      name_color: u.name_color || "gray",
      total_rating: u.total_rating ?? 100,
      solved_easy: u.solved_easy ?? 0,
      solved_medium: u.solved_medium ?? 0,
      solved_hard: u.solved_hard ?? 0,
    }));

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
      users: usersWithDefaults,
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
