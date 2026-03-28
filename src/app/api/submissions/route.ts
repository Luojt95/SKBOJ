import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

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

    // 检查是否是OI赛制的比赛
    let isOIContest = false;
    let isContestOngoing = false;
    
    if (contestId) {
      const { data: contest } = await client
        .from("contests")
        .select("id, type, start_time, end_time")
        .eq("id", contestId)
        .single();
      
      if (contest) {
        isOIContest = contest.type === "oi";
        const now = new Date();
        const endTime = new Date(contest.end_time);
        isContestOngoing = now <= endTime;
      }
    }

    // 获取题目信息和测试数据
    const { data: problem, error: problemError } = await client
      .from("problems")
      .select("test_cases, samples, time_limit, memory_limit")
      .eq("id", problemId)
      .single();

    if (problemError || !problem) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 使用测试数据，如果没有则使用样例
    let testCases = problem.test_cases || [];
    if (testCases.length === 0 && problem.samples) {
      testCases = problem.samples.map((s: any, idx: number) => ({
        input: s.input || "",
        output: s.output || "",
        score: Math.floor(100 / problem.samples.length),
      }));
    }

    // 真正评测代码
    const result = await judgeCode(code, language, testCases, problem.time_limit || 1000);

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

    // 如果AC，更新用户做题统计
    if (result.status === "ac") {
      // 获取题目难度
      const { data: problemInfo } = await client
        .from("problems")
        .select("difficulty")
        .eq("id", problemId)
        .single();

      if (problemInfo) {
        // 检查是否已解决过此题
        const { data: existingSubmission } = await client
          .from("submissions")
          .select("id")
          .eq("user_id", user.id)
          .eq("problem_id", problemId)
          .eq("status", "ac")
          .neq("id", submission.id)
          .limit(1);

        // 如果之前没解决过，更新统计
        if (!existingSubmission || existingSubmission.length === 0) {
          const difficulty = problemInfo.difficulty;
          const fieldMap: Record<string, string> = {
            "entry": "solved_entry",
            "popular_minus": "solved_popular_minus",
            "popular": "solved_popular",
            "popular_plus": "solved_popular_plus",
            "improve_plus": "solved_improve_plus",
            "provincial": "solved_provincial",
            "noi": "solved_noi",
          };
          const field = fieldMap[difficulty] || "solved_popular";
          
          // 获取当前值并更新
          const { data: currentUser } = await client
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          if (currentUser) {
            const currentCount = (currentUser as Record<string, any>)[field] || 0;
            const currentProblemRating = (currentUser as Record<string, any>).problem_rating || 0;
            const currentTotalRating = (currentUser as Record<string, any>).total_rating || 100;
            
            await client
              .from("users")
              .update({
                [field]: currentCount + 1,
                problem_rating: currentProblemRating + 10,
                total_rating: currentTotalRating + 10,
              })
              .eq("id", user.id);
          }
        }
      }
    }

    // OI赛制且比赛进行中，隐藏评测结果
    if (isOIContest && isContestOngoing) {
      return NextResponse.json({ 
        submission: {
          ...submission,
          status: "hidden",
          score: null,
          time_used: null,
          memory_used: null,
          display_status: "???",
          message: "OI赛制：比赛结束后显示评测结果"
        }
      });
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
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (problemId) {
      query = query.eq("problem_id", parseInt(problemId));
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error("Get submissions error:", error);
      return NextResponse.json({ submissions: [] });
    }

    // 获取题目信息
    const problemIds = [...new Set(submissions?.map(s => s.problem_id) || [])];
    const { data: problems } = await client
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
    console.error("Get submissions error:", error);
    return NextResponse.json({ submissions: [] });
  }
}

// 真正的评测函数
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
}> {
  if (!testCases || testCases.length === 0) {
    return {
      status: "wa",
      score: 0,
      timeUsed: 0,
      memoryUsed: 0,
      errorMessage: "没有测试数据",
    };
  }

  let totalScore = 0;
  let maxTime = 0;
  let maxMemory = 0;
  let allPassed = true;
  let compileError = false;
  let compileMessage = "";

  try {
    for (const testCase of testCases) {
      const result = await runTestCase(code, language, testCase.input, testCase.output, timeLimit);
      
      if (result.status === "ce") {
        compileError = true;
        compileMessage = result.error || "编译错误";
        break;
      }
      
      if (result.status === "ac") {
        totalScore += testCase.score || Math.floor(100 / testCases.length);
      } else {
        allPassed = false;
      }
      
      maxTime = Math.max(maxTime, result.timeUsed);
      maxMemory = Math.max(maxMemory, result.memoryUsed);
    }
  } catch (error) {
    return {
      status: "re",
      score: 0,
      timeUsed: maxTime,
      memoryUsed: maxMemory,
      errorMessage: (error as Error).message,
    };
  }

  if (compileError) {
    return {
      status: "ce",
      score: 0,
      timeUsed: 0,
      memoryUsed: 0,
      errorMessage: compileMessage,
    };
  }

  return {
    status: allPassed ? "ac" : (totalScore > 0 ? "pac" : "wa"),
    score: totalScore,
    timeUsed: maxTime,
    memoryUsed: maxMemory,
  };
}

// 运行单个测试点
async function runTestCase(
  code: string,
  language: string,
  input: string,
  expectedOutput: string,
  timeLimit: number
): Promise<{ status: string; timeUsed: number; memoryUsed: number; error?: string }> {
  const tmpDir = "/tmp/judge";
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const timestamp = Date.now();
  const inputFile = path.join(tmpDir, `input_${timestamp}.txt`);

  try {
    // 写入输入文件
    fs.writeFileSync(inputFile, input);

    if (language === "cpp") {
      return await runCpp(code, inputFile, expectedOutput, timeLimit, tmpDir, timestamp);
    } else if (language === "python") {
      return await runPython(code, inputFile, expectedOutput, timeLimit, tmpDir, timestamp);
    } else {
      return { status: "ce", timeUsed: 0, memoryUsed: 0, error: "不支持的语言" };
    }
  } finally {
    // 清理临时文件
    try {
      if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
    } catch {}
  }
}

// 运行C++代码
async function runCpp(
  code: string,
  inputFile: string,
  expectedOutput: string,
  timeLimit: number,
  tmpDir: string,
  timestamp: number
): Promise<{ status: string; timeUsed: number; memoryUsed: number; error?: string }> {
  const sourceFile = path.join(tmpDir, `code_${timestamp}.cpp`);
  const execFile = path.join(tmpDir, `code_${timestamp}`);

  try {
    // 写入源代码
    fs.writeFileSync(sourceFile, code);

    // 编译
    const compileResult = await new Promise<{ success: boolean; error: string }>((resolve) => {
      const compile = spawn("g++", ["-o", execFile, sourceFile, "-std=c++17", "-O2"]);
      let error = "";
      compile.stderr.on("data", (data) => { error += data.toString(); });
      compile.on("close", (code) => {
        resolve({ success: code === 0, error });
      });
    });

    if (!compileResult.success) {
      return { status: "ce", timeUsed: 0, memoryUsed: 0, error: compileResult.error };
    }

    // 运行
    const startTime = Date.now();
    const runResult = await new Promise<{ output: string; error: string; timedOut: boolean }>((resolve) => {
      const proc = spawn(execFile, [], { timeout: timeLimit });
      let output = "";
      let error = "";
      let timedOut = false;

      proc.stdin.write(fs.readFileSync(inputFile));
      proc.stdin.end();

      proc.stdout.on("data", (data) => { output += data.toString(); });
      proc.stderr.on("data", (data) => { error += data.toString(); });
      
      proc.on("close", () => {
        resolve({ output, error, timedOut });
      });

      proc.on("error", (err) => {
        if (err.message.includes("ETIMEDOUT")) {
          timedOut = true;
          resolve({ output, error, timedOut: true });
        } else {
          resolve({ output, error: err.message, timedOut: false });
        }
      });
    });

    const timeUsed = Date.now() - startTime;

    if (runResult.timedOut) {
      return { status: "tle", timeUsed, memoryUsed: 0 };
    }

    if (runResult.error) {
      return { status: "re", timeUsed, memoryUsed: 0, error: runResult.error };
    }

    // 比较输出
    const actualOutput = runResult.output.trim();
    const expected = expectedOutput.trim();

    if (actualOutput === expected) {
      return { status: "ac", timeUsed, memoryUsed: 0 };
    } else {
      return { status: "wa", timeUsed, memoryUsed: 0 };
    }
  } finally {
    // 清理
    try {
      if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
      if (fs.existsSync(execFile)) fs.unlinkSync(execFile);
    } catch {}
  }
}

// 运行Python代码
async function runPython(
  code: string,
  inputFile: string,
  expectedOutput: string,
  timeLimit: number,
  tmpDir: string,
  timestamp: number
): Promise<{ status: string; timeUsed: number; memoryUsed: number; error?: string }> {
  const sourceFile = path.join(tmpDir, `code_${timestamp}.py`);

  try {
    // 写入源代码
    fs.writeFileSync(sourceFile, code);

    // 运行
    const startTime = Date.now();
    const runResult = await new Promise<{ output: string; error: string; timedOut: boolean }>((resolve) => {
      const proc = spawn("python3", [sourceFile], { timeout: timeLimit });
      let output = "";
      let error = "";
      let timedOut = false;

      proc.stdin.write(fs.readFileSync(inputFile));
      proc.stdin.end();

      proc.stdout.on("data", (data) => { output += data.toString(); });
      proc.stderr.on("data", (data) => { error += data.toString(); });
      
      proc.on("close", () => {
        resolve({ output, error, timedOut });
      });

      proc.on("error", (err) => {
        if (err.message.includes("ETIMEDOUT")) {
          timedOut = true;
          resolve({ output, error, timedOut: true });
        } else {
          resolve({ output, error: err.message, timedOut: false });
        }
      });
    });

    const timeUsed = Date.now() - startTime;

    if (runResult.timedOut) {
      return { status: "tle", timeUsed, memoryUsed: 0 };
    }

    if (runResult.error) {
      return { status: "re", timeUsed, memoryUsed: 0, error: runResult.error };
    }

    // 比较输出
    const actualOutput = runResult.output.trim();
    const expected = expectedOutput.trim();

    if (actualOutput === expected) {
      return { status: "ac", timeUsed, memoryUsed: 0 };
    } else {
      return { status: "wa", timeUsed, memoryUsed: 0 };
    }
  } finally {
    // 清理
    try {
      if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    } catch {}
  }
}
