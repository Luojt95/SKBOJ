import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const JUDGE0_URL = "https://ce.judge0.com";

const getSupabaseClient = () => {
  const url = process.env.coze_supabase_url;
  const key = process.env.coze_supabase_anon_key;
  if (!url || !key) throw new Error("Supabase 环境变量未配置");
  return createClient(url, key);
};

async function executeWithJudge0(
  code: string,
  language: string,
  stdin: string,
  timeLimit: number
): Promise<{ stdout: string; stderr: string; compile_output: string; time: number; memory: number; status: number }> {
  const languageMap: Record<string, number> = { cpp: 54, python: 71 };
  const languageId = languageMap[language];
  if (!languageId) throw new Error(`不支持的语言: ${language}`);

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

  if (!response.ok) throw new Error(`Judge0 API 错误: ${response.status}`);
  const result = await response.json();

  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    compile_output: result.compile_output || "",
    time: result.time ? parseFloat(result.time) * 1000 : 0,
    memory: result.memory || 0,
    status: result.status_id || 0,
  };
}

async function judgeCode(
  code: string,
  language: string,
  testCases: Array<{ input: string; output: string; score?: number }>,
  timeLimit: number
): Promise<{
  status: string;
  score: number;
  timeUsed: number;
  memoryUsed: number;
  errorMessage?: string;
  statusCounts: { ac: number; wa: number; re: number; tle: number; mle: number };
}> {
  if (!testCases || testCases.length === 0) {
    return {
      status: "ce",
      score: 0,
      timeUsed: 0,
      memoryUsed: 0,
      errorMessage: "题目没有测试数据，请联系管理员",
      statusCounts: { ac: 0, wa: 0, re: 0, tle: 0, mle: 0 },
    };
  }

  const limitedTestCases = testCases.slice(0, 30);
  let totalScore = 0;
  let maxTime = 0;
  let maxMemory = 0;
  let allPassed = true;

  const statusCounts = { ac: 0, wa: 0, re: 0, tle: 0, mle: 0 };

  const compileCheck = await executeWithJudge0(code, language, "", 1000);
  if (compileCheck.status === 6 || compileCheck.compile_output) {
    return {
      status: "ce",
      score: 0,
      timeUsed: 0,
      memoryUsed: 0,
      errorMessage: `编译错误:\n${compileCheck.compile_output || compileCheck.stderr}`,
      statusCounts,
    };
  }

  for (let i = 0; i < limitedTestCases.length; i++) {
    const tc = limitedTestCases[i];
    try {
      const result = await executeWithJudge0(code, language, tc.input, timeLimit);

      const actualRaw = result.stdout || "";
      const expectedRaw = tc.output || "";
      const actual = actualRaw.trim();
      const expected = expectedRaw.trim();
      const perScore = tc.score || Math.floor(100 / limitedTestCases.length);

      // 调试日志
      console.log(`\n[DEBUG] Test case ${i + 1}:`);
      console.log(`[DEBUG] actualRaw length: ${actualRaw.length}, hex: ${Buffer.from(actualRaw).toString('hex')}`);
      console.log(`[DEBUG] expectedRaw length: ${expectedRaw.length}, hex: ${Buffer.from(expectedRaw).toString('hex')}`);
      console.log(`[DEBUG] actual trimmed: "${actual}"`);
      console.log(`[DEBUG] expected trimmed: "${expected}"`);

      if (result.status === 3) {
        if (actual === expected) {
          statusCounts.ac++;
          totalScore += perScore;
        } else {
          statusCounts.wa++;
          allPassed = false;
        }
      } else if (result.status === 4) {
        statusCounts.wa++;
        allPassed = false;
      } else if (result.status === 5) {
        statusCounts.tle++;
        allPassed = false;
      } else if (result.status >= 7 && result.status <= 12) {
        statusCounts.re++;
        allPassed = false;
      } else {
        statusCounts.wa++;
        allPassed = false;
      }

      maxTime = Math.max(maxTime, result.time);
      maxMemory = Math.max(maxMemory, result.memory);
    } catch (err) {
      statusCounts.re++;
      allPassed = false;
    }
  }

  const finalStatus = allPassed ? "ac" : "pac";
  const displayStatus = finalStatus === "ac" ? "AC" : "UAC";
  const memoryDisplay = maxMemory >= 1024 
    ? `${(maxMemory / 1024).toFixed(2)}MB` 
    : `${maxMemory}KB`;
  
  const feedback = `Status:${displayStatus}\nscore:${totalScore}\nruntime:${maxTime}ms\nrunmemory:${memoryDisplay}\nAC:${statusCounts.ac}\nWA:${statusCounts.wa}\nRE:${statusCounts.re}\nTLE:${statusCounts.tle}\nMLE:${statusCounts.mle}`;

  return {
    status: finalStatus,
    score: totalScore,
    timeUsed: maxTime,
    memoryUsed: maxMemory,
    errorMessage: feedback,
    statusCounts,
  };
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");
    if (!userCookie) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    
    const problem_id = body.problem_id || body.problemId;
    const { code, language, contestId } = body;

    if (!problem_id || !code) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data: problem, error: problemError } = await supabase
      .from("problems")
      .select("test_cases, samples, time_limit, memory_limit")
      .eq("id", problem_id)
      .single();

    if (problemError || !problem) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    let testCases = problem.test_cases || [];
    if (testCases.length === 0 && problem.samples && problem.samples.length > 0) {
      testCases = problem.samples.map((s: any) => ({ input: s.input || "", output: s.output || "" }));
    }

    const result = await judgeCode(code, language, testCases, problem.time_limit || 1000);

    const { data: submission, error: insertError } = await supabase
      .from("submissions")
      .insert({
        problem_id,
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

    if (insertError) {
      console.error("Create submission error:", insertError);
      return NextResponse.json({ error: "提交失败" }, { status: 500 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json({ error: "提交失败: " + (error as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");
    if (!userCookie) return NextResponse.json({ submissions: [] });

    const user = JSON.parse(userCookie.value);
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get("problemId");

    const supabase = getSupabaseClient();
    let query = supabase
      .from("submissions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (problemId) query = query.eq("problem_id", parseInt(problemId));

    const { data: submissions } = await query;

    const problemIds = [...new Set(submissions?.map(s => s.problem_id) || [])];
    const { data: problems } = await supabase
      .from("problems")
      .select("id, title")
      .in("id", problemIds);

    const problemMap = new Map(problems?.map(p => [p.id, p.title]) || []);
    const submissionsWithProblem = submissions?.map(s => ({
      ...s,
      problems: { title: problemMap.get(s.problem_id) || `题目${s.problem_id}` }
    })) || [];

    return NextResponse.json({ submissions: submissionsWithProblem });
  } catch (error) {
    return NextResponse.json({ submissions: [] });
  }
}
