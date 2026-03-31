import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取题目列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    let user = null;
    if (userCookie) {
      try {
        user = JSON.parse(userCookie.value);
      } catch {
        // ignore
      }
    }

    // 构建查询
    let query = client
      .from("problems")
      .select("id, title, difficulty, category, tags, author_id, is_visible, created_at")
      .order("id", { ascending: true });

    // 如果不是管理员/站长，只显示公开的题目
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      query = query.eq("is_visible", true);
    }

    const { data: problems, error } = await query;

    if (error) {
      return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
    }

    // 获取所有题目的提交统计
    const problemIds = (problems || []).map(p => p.id);
    
    // 获取每个题目的提交总数
    const { data: submissionStats } = await client
      .from("submissions")
      .select("problem_id, status")
      .in("problem_id", problemIds);

    // 计算每个题目的提交数和通过数
    const statsMap: Record<number, { total: number; accepted: number }> = {};
    (submissionStats || []).forEach(s => {
      if (!statsMap[s.problem_id]) {
        statsMap[s.problem_id] = { total: 0, accepted: 0 };
      }
      statsMap[s.problem_id].total++;
      if (s.status === "ac") {
        statsMap[s.problem_id].accepted++;
      }
    });

    // 合并统计信息到题目数据
    const problemsWithStats = (problems || []).map(p => ({
      ...p,
      submission_count: statsMap[p.id]?.total || 0,
      accepted_count: statsMap[p.id]?.accepted || 0,
    }));

    return NextResponse.json({ problems: problemsWithStats });
  } catch (error) {
    console.error("Get problems error:", error);
    return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
  }
}

// 创建题目
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);

    // 只有管理员和站长可以创建题目
    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const body = await request.json();
    const client = getSupabaseClient();

    // 验证必填字段
    if (!body.title || !body.description) {
      return NextResponse.json({ error: "标题和描述不能为空" }, { status: 400 });
    }

    const { data: problem, error } = await client
      .from("problems")
      .insert({
        title: body.title,
        description: body.description,
        input_format: body.inputFormat || "",
        output_format: body.outputFormat || "",
        samples: body.samples || [],
        hint: body.hint || "",
        category: body.category || "P",
        difficulty: body.difficulty || "popular",
        time_limit: body.timeLimit || 1000,
        memory_limit: body.memoryLimit || 256,
        is_visible: body.isVisible ?? true,
        author_id: user.id,
        tags: body.tags || [],
        test_cases: body.testCases || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Create problem error:", error);
      return NextResponse.json({ error: "创建题目失败: " + (error.message || "数据库错误") }, { status: 500 });
    }

    return NextResponse.json({ problem });
  } catch (error) {
    console.error("Create problem error:", error);
    return NextResponse.json({ error: "创建题目失败: " + ((error as Error).message || "未知错误") }, { status: 500 });
  }
}
