import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 提交代码
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    const { problemId, language, code, contestId } = body;

    if (!problemId || !code) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 获取题目信息和测试数据
    const { data: problem, error: problemError } = await client
      .from("problems")
      .select("test_cases, time_limit, memory_limit")
      .eq("id", problemId)
      .single();

    if (problemError || !problem) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 模拟评测（实际应该使用沙箱环境）
    const result = simulateJudge(code, language, problem.test_cases || []);

    // 保存提交记录
    const { data: submission, error } = await client
      .from("submissions")
      .insert({
        problem_id: problemId,
        user_id: user.id,
        language,
        code,
        status: result.status,
        score: result.score,
        time_used: result.timeUsed,
        memory_used: result.memoryUsed,
        error_message: result.errorMessage,
        contest_id: contestId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create submission error:", error);
      return NextResponse.json({ error: "提交失败" }, { status: 500 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}

// 获取提交记录
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get("problemId");

    const client = getSupabaseClient();

    let query = client
      .from("submissions")
      .select("*, problems(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (problemId) {
      query = query.eq("problem_id", parseInt(problemId));
    }

    const { data: submissions, error } = await query;

    if (error) {
      return NextResponse.json({ error: "获取记录失败" }, { status: 500 });
    }

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("Get submissions error:", error);
    return NextResponse.json({ error: "获取记录失败" }, { status: 500 });
  }
}

// 模拟评测函数
function simulateJudge(
  code: string,
  language: string,
  testCases: Array<{ input: string; output: string }>
): {
  status: string;
  score: number;
  timeUsed: number;
  memoryUsed: number;
  errorMessage?: string;
} {
  // 简单模拟 - 实际应该使用沙箱评测
  const hasError = code.includes("error") || code.length < 10;

  if (hasError) {
    return {
      status: "ce",
      score: 0,
      timeUsed: 0,
      memoryUsed: 0,
      errorMessage: "编译错误",
    };
  }

  // 随机生成结果
  const random = Math.random();
  let status = "ac";
  let score = 100;

  if (random < 0.3) {
    status = "wa";
    score = 0;
  } else if (random < 0.4) {
    status = "tle";
    score = 50;
  } else if (random < 0.45) {
    status = "re";
    score = 30;
  }

  return {
    status,
    score,
    timeUsed: Math.floor(Math.random() * 500) + 10,
    memoryUsed: Math.floor(Math.random() * 10000) + 1000,
  };
}
