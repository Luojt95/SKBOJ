import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 创建题解
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    const { problem_id, title, content } = body;

    if (!problem_id || !title || !content) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 检查题目是否存在
    const { data: problem, error: problemError } = await client
      .from("problems")
      .select("id")
      .eq("id", problem_id)
      .single();

    if (problemError || !problem) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 创建题解
    const { data: solution, error } = await client
      .from("solutions")
      .insert({
        problem_id,
        user_id: user.id,
        title,
        content,
        likes: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Create solution error:", error);
      return NextResponse.json({ error: "创建失败" }, { status: 500 });
    }

    return NextResponse.json({ solution });
  } catch (error) {
    console.error("Create solution error:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

// 获取题解列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get("problem_id");

    const client = getSupabaseClient();

    let query = client
      .from("solutions")
      .select(`
        id,
        problem_id,
        title,
        content,
        likes,
        created_at,
        updated_at,
        user_id
      `)
      .order("created_at", { ascending: false });

    if (problemId) {
      query = query.eq("problem_id", parseInt(problemId));
    }

    const { data: solutions, error } = await query;

    if (error) {
      console.error("Get solutions error:", error);
      return NextResponse.json({ solutions: [] });
    }

    // 获取用户信息
    let solutionsWithUsers: any[] = [];
    if (solutions && solutions.length > 0) {
      const userIds = [...new Set(solutions.map(s => s.user_id))];
      const { data: users } = await client
        .from("users")
        .select("id, username, role")
        .in("id", userIds);
      
      const usersMap = new Map((users || []).map(u => [u.id, u]));
      solutionsWithUsers = solutions.map(s => ({
        ...s,
        users: usersMap.get(s.user_id) || null
      }));
    }

    return NextResponse.json({ solutions: solutionsWithUsers });
  } catch (error) {
    console.error("Get solutions error:", error);
    return NextResponse.json({ solutions: [] });
  }
}
