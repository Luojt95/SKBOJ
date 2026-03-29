import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const offset = (page - 1) * pageSize;

    const client = getSupabaseClient();

    // 获取总数
    const { count: totalUsers } = await client
      .from("users")
      .select("*", { count: "exact", head: true });

    // 获取用户列表（分页）
    const { data: users, error: usersError } = await client
      .from("users")
      .select(`
        id, username, role, created_at, 
        name_color, total_rating, rating,
        warning_level, warning_reason, warning_at,
        solved_entry, solved_popular_minus, solved_popular, 
        solved_popular_plus, solved_improve_plus, solved_provincial, solved_noi
      `)
      .order("total_rating", { ascending: false })
      .range(offset, offset + pageSize - 1);

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

    // 获取统计数据（用户总数已经在上面获取过了）
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
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil((totalUsers || 0) / pageSize),
        total: totalUsers || 0,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
