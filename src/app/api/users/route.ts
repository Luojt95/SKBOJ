import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET() {
  try {
    const client = getSupabaseClient();

    // 获取用户列表
    const { data: users, error: usersError } = await client
      .from("users")
      .select(`
        id, username, role, created_at, 
        name_color, total_rating,
        solved_entry, solved_popular_minus, solved_popular, 
        solved_popular_plus, solved_improve_plus, solved_provincial, solved_noi
      `)
      .order("total_rating", { ascending: false })
      .limit(100);

    if (usersError) {
      console.error("Users query error:", usersError);
      return NextResponse.json({ error: "获取失败" }, { status: 500 });
    }

    // 计算总做题数
    const usersWithTotal = (users || []).map(u => ({
      ...u,
      name_color: u.name_color || "gray",
      total_rating: u.total_rating ?? 100,
      solved_total:
        (u.solved_entry || 0) +
        (u.solved_popular_minus || 0) +
        (u.solved_popular || 0) +
        (u.solved_popular_plus || 0) +
        (u.solved_improve_plus || 0) +
        (u.solved_provincial || 0) +
        (u.solved_noi || 0),
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
      users: usersWithTotal,
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
