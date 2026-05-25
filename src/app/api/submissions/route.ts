import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const JUDGE0_URL = "https://ce.judge0.com";

// 调用 Judge0 执行代码
async function executeWithJudge0(
  code: string,
  language: string,
  stdin: string,
  timeLimit: number
): Promise<{ stdout: string; stderr: string; compile_output: string; time: number; memory: number }> {
  const languageMap: Record<string, number> = {
    cpp: 54,
    python: 71,
  };

  const languageId = languageMap[language];
  if (!languageId) {
    throw new Error(`不支持的语言: ${language}`);
  }

  const response = await fetch(`${JUDGE0_URL}/submissions?wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_code: code,
      language_id: languageId,
      stdin: stdin,
      cpu_time_limit: timeLimit / 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Judge0 API 错误: ${response.status}`);
  }

  const result = await response.json();
  
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    compile_output: result.compile_output || "",
    time: result.time ? parseFloat(result.time) * 1000 : 0,
    memory: result.memory || 0,
  };
}

// 判题函数
async function judgeWithJudge0(
  code: string,
  language: string,
  testCases: Array<{ input: string; expected_output: string }>,
  timeLimit: number
): Promise<{ status: string; score: number; timeUsed: number; memoryUsed: number; error?: string; details?: any[] }> {
  const results = [];
  let totalScore = 0;
  let maxTime = 0;
  let maxMemory = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      const result = await executeWithJudge0(code, language, tc.input, timeLimit);
      
      // 比较输出（去除末尾空格和换行）
      const actual = result.stdout.trim();
      const expected = tc.expected_output.trim();
      const passed = actual === expected;
      
      if (passed) {
        totalScore += Math.floor(100 / testCases.length);
      }
      
      results.push({
        testCase: i + 1,
        passed,
        input: tc.input,
        expected,
        actual,
        time: result.time,
        memory: result.memory,
        stderr: result.stderr,
        compile_output: result.compile_output,
      });
      
      maxTime = Math.max(maxTime, result.time);
      maxMemory = Math.max(maxMemory, result.memory);
      
      // 如果有编译错误，停止判题
      if (result.compile_output) {
        return {
          status: "ce",
          score: 0,
          timeUsed: 0,
          memoryUsed: 0,
          error: `编译错误:\n${result.compile_output}`,
          details: results,
        };
      }
    } catch (err) {
      return {
        status: "error",
        score: 0,
        timeUsed: 0,
        memoryUsed: 0,
        error: (err as Error).message,
        details: results,
      };
    }
  }

  const allPassed = results.every(r => r.passed);
  const status = allPassed ? "ac" : "wa";

  return {
    status,
    score: totalScore,
    timeUsed: maxTime,
    memoryUsed: maxMemory,
    details: results,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { problem_id, code, language } = body;

    if (!problem_id || !code || !language) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 获取题目信息（测试用例从题目表或单独的测试用例表获取）
    const { data: problem, error: problemError } = await supabase
      .from("problems")
      .select("title, time_limit, memory_limit, test_cases")
      .eq("id", problem_id)
      .single();

    if (problemError || !problem) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 获取测试用例（假设存储在 test_cases 字段或单独的表中）
    let testCases = problem.test_cases;
    if (!testCases || testCases.length === 0) {
      // 如果没有测试用例，返回通过（仅测试）
      const submissionId = randomUUID();
      await supabase.from("submissions").insert({
        id: submissionId,
        problem_id,
        user_id: session.user.id,
        code,
        language,
        status: "ac",
        score: 100,
        time_used: 0,
        memory_used: 0,
        created_at: new Date().toISOString(),
      });
      
      return NextResponse.json({
        id: submissionId,
        status: "ac",
        score: 100,
        time: 0,
        memory: 0,
      });
    }

    // 执行判题
    const judgeResult = await judgeWithJudge0(
      code,
      language,
      testCases,
      problem.time_limit || 1000
    );

    // 保存提交记录
    const submissionId = randomUUID();
    const { error: insertError } = await supabase.from("submissions").insert({
      id: submissionId,
      problem_id,
      user_id: session.user.id,
      code,
      language,
      status: judgeResult.status,
      score: judgeResult.score,
      time_used: judgeResult.timeUsed,
      memory_used: judgeResult.memoryUsed,
      error_message: judgeResult.error,
      details: judgeResult.details,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("保存提交记录失败:", insertError);
    }

    return NextResponse.json({
      id: submissionId,
      status: judgeResult.status,
      score: judgeResult.score,
      time: judgeResult.timeUsed,
      memory: judgeResult.memoryUsed,
      error: judgeResult.error,
      details: judgeResult.details,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "提交失败: " + (error as Error).message },
      { status: 500 }
    );
  }
}
