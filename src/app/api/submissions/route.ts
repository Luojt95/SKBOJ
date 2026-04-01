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

    console.log("Submission request:", { problemId, language, codeLength: code?.length, contestId, userId: user.id });

    if (!problemId || !code) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 检查是否是OI赛制的比赛
    let isOIContest = false;
    let isContestOngoing = false;
    let contestFormat = "OI";
    let adminThreshold = null;
    
    if (contestId) {
      const { data: contest } = await client
        .from("contests")
        .select("id, type, format, admin_threshold, start_time, end_time")
        .eq("id", contestId)
        .single();
      
      if (contest) {
        isOIContest = contest.type === "oi";
        contestFormat = contest.format || "OI";
        adminThreshold = contest.admin_threshold;
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

    if (problemError) {
      console.error("Get problem error:", problemError);
      return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
    }
    
    if (!problem) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 使用测试数据，如果没有则使用样例
    let testCases = problem.test_cases || [];
    if (testCases.length === 0 && problem.samples && problem.samples.length > 0) {
      testCases = problem.samples.map((s: any, idx: number) => ({
        input: s.input || "",
        output: s.output || "",
        score: Math.floor(100 / problem.samples.length),
      }));
    }
    
    // 如果没有任何测试数据，创建一个默认测试点
    if (testCases.length === 0) {
      console.warn("No test cases for problem:", problemId);
      return NextResponse.json({ error: "题目没有测试数据，请联系管理员添加" }, { status: 400 });
    }

    console.log("Test cases count:", testCases.length, "Time limit:", problem.time_limit);

    // 真正评测代码
    console.log("Starting judge...");
    const result = await judgeCode(code, language, testCases, problem.time_limit || 1000);
    console.log("Judge result:", result);

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

    // CS赛制：检查是否达到管理员门槛
    if (contestId && contestFormat === "CS" && adminThreshold !== null) {
      // 计算用户在比赛中的总分
      const { data: contestSubmissions } = await client
        .from("submissions")
        .select("problem_id, score")
        .eq("user_id", user.id)
        .eq("contest_id", contestId);

      if (contestSubmissions && contestSubmissions.length > 0) {
        // 取每道题的最高分
        const problemScores = new Map<number, number>();
        for (const sub of contestSubmissions) {
          const current = problemScores.get(sub.problem_id) || 0;
          if ((sub.score || 0) > current) {
            problemScores.set(sub.problem_id, sub.score || 0);
          }
        }
        
        const totalScore = Array.from(problemScores.values()).reduce((a, b) => a + b, 0);
        
        // 如果达到门槛且用户还不是管理员，自动设为管理员
        if (totalScore >= adminThreshold && user.role === "user") {
          await client
            .from("users")
            .update({ role: "admin" })
            .eq("id", user.id);
          
          // 给用户发送通知
          await client.from("notifications").insert({
            user_id: user.id,
            type: "admin_promotion",
            title: "恭喜您成为管理员",
            content: `您在CS赛制比赛中达到 ${totalScore} 分（门槛：${adminThreshold} 分），已被自动设置为管理员！`,
            related_type: "contest",
            related_id: contestId,
          });
          
          // 增加积分（成为管理员+50）
          const { addPoints, POINTS_REWARD } = await import("@/lib/points-system");
          await addPoints(user.id, POINTS_REWARD.BECOME_ADMIN, "成为管理员");
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
  testResults?: Array<{ status: string; score: number }>;
  statusCounts?: {
    ac: number;
    wa: number;
    re: number;
    tle: number;
    mle: number;
  };
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

  // 限制测试点数量，防止评测时间过长（上限30个）
  const maxTestCases = 30;
  const limitedTestCases = testCases.slice(0, maxTestCases);
  
  // 重新计算每个测试点的分数
  const scorePerCase = Math.floor(100 / limitedTestCases.length);
  limitedTestCases.forEach(tc => tc.score = scorePerCase);
  
  let totalScore = 0;
  let maxTime = 0;
  let maxMemory = 0;
  let allPassed = true;
  let compileError = false;
  let compileMessage = "";
  
  // 统计各状态测试点数量
  const statusCounts = {
    ac: 0,
    wa: 0,
    re: 0,
    tle: 0,
    mle: 0,
  };
  
  // 记录每个测试点的结果
  const testResults: Array<{ status: string; score: number }> = [];

  try {
    for (let i = 0; i < limitedTestCases.length; i++) {
      const testCase = limitedTestCases[i];
      console.log(`Running test case ${i + 1}/${limitedTestCases.length}`);
      
      try {
        const result = await runTestCase(code, language, testCase.input, testCase.output, timeLimit);
        
        if (result.status === "ce") {
          compileError = true;
          compileMessage = result.error || "编译错误";
          break;
        }
        
        // 统计各状态（支持TLE和MLE重复计数）
        if (result.status === "ac") {
          statusCounts.ac++;
          totalScore += testCase.score || 0;
        } else if (result.status === "wa") {
          statusCounts.wa++;
          allPassed = false;
        } else if (result.status === "re") {
          statusCounts.re++;
          allPassed = false;
        } else if (result.status === "tle") {
          statusCounts.tle++;
          allPassed = false;
          // 如果同时MLE，也计数
          if (result.isMLE) {
            statusCounts.mle++;
          }
        } else if (result.status === "mle") {
          statusCounts.mle++;
          allPassed = false;
          // 如果同时TLE，也计数
          if (result.isTLE) {
            statusCounts.tle++;
          }
        }
        
        testResults.push({ status: result.status, score: result.status === "ac" ? (testCase.score || 0) : 0 });
        
        maxTime = Math.max(maxTime, result.timeUsed);
        maxMemory = Math.max(maxMemory, result.memoryUsed);
      } catch (testError) {
        console.error(`Test case ${i + 1} error:`, testError);
        allPassed = false;
        statusCounts.re++;
        testResults.push({ status: "re", score: 0 });
      }
    }
  } catch (error) {
    console.error("Judge error:", error);
    return {
      status: "re",
      score: 0,
      timeUsed: maxTime,
      memoryUsed: maxMemory,
      errorMessage: (error as Error).message,
    };
  }

  // CE格式
  if (compileError) {
    const ceFeedback = `Status:CE\nscore:0\n${compileMessage}`;
    return {
      status: "ce",
      score: 0,
      timeUsed: 0,
      memoryUsed: 0,
      errorMessage: ceFeedback,
      testResults: [],
      statusCounts,
    };
  }

  // 确定最终状态
  let finalStatus = "wa";
  if (allPassed) {
    finalStatus = "ac";
  } else if (totalScore > 0) {
    finalStatus = "pac";  // 部分通过，显示UAC
  } else if (statusCounts.re > 0) {
    finalStatus = "re";
  } else if (statusCounts.tle > 0) {
    finalStatus = "tle";
  } else if (statusCounts.mle > 0) {
    finalStatus = "mle";
  }

  // 构建编译成功的评测反馈信息
  const displayStatus = finalStatus === "pac" ? "UAC" : finalStatus.toUpperCase();
  const memoryDisplay = maxMemory >= 1024 
    ? `${(maxMemory / 1024).toFixed(2)}MB` 
    : `${maxMemory}KB`;
  
  const successFeedback = `Status:${displayStatus}\nscore:${totalScore}\nruntime:${maxTime}ms\nrunmemory:${memoryDisplay}\nAC:${statusCounts.ac}\nWA:${statusCounts.wa}\nRE:${statusCounts.re}\nTLE:${statusCounts.tle}\nMLE:${statusCounts.mle}`;

  return {
    status: finalStatus,
    score: totalScore,
    timeUsed: maxTime,
    memoryUsed: maxMemory,
    errorMessage: successFeedback,
    testResults,
    statusCounts,
  };
}

// 运行单个测试点
async function runTestCase(
  code: string,
  language: string,
  input: string,
  expectedOutput: string,
  timeLimit: number
): Promise<{ status: string; timeUsed: number; memoryUsed: number; error?: string; isTLE?: boolean; isMLE?: boolean }> {
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
): Promise<{ status: string; timeUsed: number; memoryUsed: number; error?: string; isTLE?: boolean; isMLE?: boolean }> {
  const sourceFile = path.join(tmpDir, `code_${timestamp}.cpp`);
  const execFile = path.join(tmpDir, `code_${timestamp}`);

  try {
    // 写入源代码
    fs.writeFileSync(sourceFile, code);

    // 编译（带超时）
    const compileResult = await new Promise<{ success: boolean; error: string }>((resolve) => {
      const compile = spawn("g++", ["-o", execFile, sourceFile, "-std=c++17", "-O2"]);
      let error = "";
      let finished = false;
      
      // 编译超时10秒
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          compile.kill();
          resolve({ success: false, error: "编译超时" });
        }
      }, 10000);
      
      compile.stderr.on("data", (data) => { error += data.toString(); });
      compile.on("close", (code) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          resolve({ success: code === 0, error });
        }
      });
      compile.on("error", (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          resolve({ success: false, error: err.message });
        }
      });
    });

    if (!compileResult.success) {
      return { status: "ce", timeUsed: 0, memoryUsed: 0, error: compileResult.error };
    }

    // 运行
    const startTime = Date.now();
    const runResult = await new Promise<{ output: string; error: string; timedOut: boolean }>((resolve) => {
      const proc = spawn(execFile, []);
      let output = "";
      let error = "";
      let finished = false;

      // 设置超时
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          proc.kill();
          resolve({ output, error, timedOut: true });
        }
      }, timeLimit + 1000);

      try {
        proc.stdin.write(fs.readFileSync(inputFile));
        proc.stdin.end();
      } catch (e) {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          resolve({ output: "", error: "输入写入失败", timedOut: false });
          return;
        }
      }

      proc.stdout.on("data", (data) => { output += data.toString(); });
      proc.stderr.on("data", (data) => { error += data.toString(); });
      
      proc.on("close", () => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          resolve({ output, error, timedOut: false });
        }
      });

      proc.on("error", (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
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
): Promise<{ status: string; timeUsed: number; memoryUsed: number; error?: string; isTLE?: boolean; isMLE?: boolean }> {
  const sourceFile = path.join(tmpDir, `code_${timestamp}.py`);

  try {
    // 写入源代码
    fs.writeFileSync(sourceFile, code);

    // 运行
    const startTime = Date.now();
    const runResult = await new Promise<{ output: string; error: string; timedOut: boolean }>((resolve) => {
      const proc = spawn("python3", [sourceFile]);
      let output = "";
      let error = "";
      let finished = false;

      // 设置超时
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          proc.kill();
          resolve({ output, error, timedOut: true });
        }
      }, timeLimit + 1000);

      try {
        proc.stdin.write(fs.readFileSync(inputFile));
        proc.stdin.end();
      } catch (e) {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          resolve({ output: "", error: "输入写入失败", timedOut: false });
          return;
        }
      }

      proc.stdout.on("data", (data) => { output += data.toString(); });
      proc.stderr.on("data", (data) => { error += data.toString(); });
      
      proc.on("close", () => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          resolve({ output, error, timedOut: false });
        }
      });

      proc.on("error", (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
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
