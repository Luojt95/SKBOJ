import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取题目的提交历史
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const problemId = parseInt(id);

    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ submissions: [] });
    }

    const currentUser = JSON.parse(userCookie.value);
    const client = getSupabaseClient();

    // 获取题目信息，判断当前用户是否是出题人或管理员
    const { data: problem } = await client
      .from("problems")
      .select("author_id")
      .eq("id", problemId)
      .single();

    const isAuthorOrAdmin = 
      currentUser.role === "super_admin" ||
      currentUser.role === "admin" ||
      (problem && problem.author_id === currentUser.id);

    // 构建查询
    let query = client
      .from("submissions")
      .select(`
        id,
        user_id,
        problem_id,
        language,
        code,
        status,
        score,
        time_used,
        memory_used,
        test_results,
        created_at,
        users!submissions_user_id_fkey (
          id,
          username,
          role
        )
      `)
      .eq("problem_id", problemId)
      .order("created_at", { ascending: false })
      .limit(50);

    // 如果不是出题人或管理员，只看自己的提交
    if (!isAuthorOrAdmin) {
      query = query.eq("user_id", currentUser.id);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error("Get submissions error:", error);
      return NextResponse.json({ submissions: [] });
    }

    return NextResponse.json({ submissions: submissions || [] });
  } catch (error) {
    console.error("Get submissions error:", error);
    return NextResponse.json({ submissions: [] });
  }
}
