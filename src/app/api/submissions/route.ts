import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

const JUDGE0_URL = "https://ce.judge0.com";

// 调用 Judge0 执行代码
async function executeWithJudge0(
  code: string,
  language: string,
  stdin: string,
  timeLimit: number
): Promise<{ stdout: string; stderr: string; compile_output: string; time: number; memory: number; status: number }> {
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
    status: result.status_id || 0,
  };
}

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
        isOIContest = contest.format === "OI";
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
    
    let testCases = problem.test_cases || [];
    if (testCases.length === 0 && problem.samples && problem.samples.length > 0) {
      testCases = problem.samples.map((s: any) => ({
        input: s.input || "",
        output: s.output || "",
      }));
    }
    
    if (testCases.length === 0) {
      console.warn("No test cases for problem:", problemId);
      return NextResponse.json({ error: "题目没有测试数据，请联系管理员添加" }, { status: 400 });
    }

    console.log("Test cases count:", testCases.length, "Time limit:", problem.time_limit);

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

    if (result.status === "ac") {
      const { data: problemInfo } = await client
        .from("problems")
        .select("difficulty")
        .eq("id", problemId)
        .single();

      if (problemInfo) {
        const { data: existingSubmission } = await client
          .from("submissions")
          .select("id")
          .eq("user_id", user.id)
          .eq("problem_id", problemId)
          .eq("status", "ac")
          .neq("id", submission.id)
          .limit(1);

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

    const effectiveFormat = contestFormat || "IOI";
    if (contestId && (effectiveFormat === "CS" || effectiveFormat === "OI" || effectiveFormat === "IOI")) {
      console.log(`[Score Update] Updating score for contest ${contestId}, format: ${effectiveFormat}`);
      
      const { data: contestSubmissions } = await client
        .from("submissions")
        .select("problem_id, score")
        .eq("user_id", user.id)
        .eq("contest_id", contestId);

      console.log(`[Score Update] User submissions:`, contestSubmissions);

      if (contestSubmissions && contestSubmissions.length > 0) {
        const problemScores = new Map<number, number>();
        for (const sub of contestSubmissions) {
          const current = problemScores.get(sub.problem_id) || 0;
          if ((sub.score || 0) > current) {
            problemScores.set(sub.problem_id, sub.score || 0);
          }
        }
        
        const totalScore = Array.from(problemScores.values()).reduce((a, b) => a + b, 0);
        console.log(`[Score Update] Calculated total score: ${totalScore}, problem scores: ${JSON.stringify(Object.fromEntries(problemScores))}`);
        
        const { error: updateError } = await client
          .from("contest_participants")
          .update({ 
            score: totalScore,
            problem_scores: Object.fromEntries(problemScores)
          })
          .eq("contest_id", contestId)
          .eq("user_id", user.id);
        
        if (updateError) {
          console.error(`[Score Update] Error updating score:`, updateError);
        } else {
          console.log(`[Score Update] Successfully updated score to ${totalScore}`);
        }
      } else {
        console.log(`[Score Update] No submissions found, setting score to 0`);
        await client
          .from("contest_participants")
          .update({ score: 0 })
          .eq("contest_id", contestId)
          .eq("user_id", user.id);
      }
    } else {
      console.log(`[Score Update] Skipped - contestId: ${contestId}, format: ${contestFormat}`);
    }

    if (contestId && (contestFormat === "CS" || contestFormat === "IOI") && adminThreshold !== null) {
      const { data: contestSubmissions } = await client
        .from("submissions")
        .select("problem_id, score")
        .eq("user_id", user.id)
        .eq("contest_id", contestId);

      if (contestSubmissions && contestSubmissions.length > 0) {
        const problemScores = new Map<number, number>();
        for (const sub of contestSubmissions) {
          const current = problemScores.get(sub.problem_id) || 0;
          if ((sub.score || 0) > current) {
            problemScores.set(sub.problem_id, sub.score || 0);
          }
        }
        
        const totalScore = Array.from(problemScores.values()).reduce((a, b) => a + b, 0);
        
        if (totalScore >= adminThreshold && user.role === "user") {
          await client
            .from("users")
            .update({ role: "admin" })
            .eq("id", user.id);
          
          await client.from("notifications").insert({
            user_id: user.id,
            type: "admin_promotion",
            title: "恭喜您成为管理员",
            content: `您在CS赛制比赛中达到 ${totalScore} 分（门槛：${adminThreshold} 分），已被自动设置为管理员！`,
            related_type: "contest",
            related_id: contestId,
          });
        }
      }
    }

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

// 真正的评测函数（使用 Judge0 API）
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

  const maxTestCases = 30;
  const limitedTestCases = testCases.slice(0, maxTestCases);
  
  let totalScore = 0;
  let maxTime = 0;
  let maxMemory = 0;
  let allPassed = true;
  let compileError = false;
  let compileMessage = "";
  
  const statusCounts = {
    ac: 0,
    wa: 0,
    re: 0,
    tle: 0,
    mle: 0,
  };
  
  const testResults: Array<{ status: string; score: number }> = [];

  // 先尝试编译（执行一个空代码或检测是否有编译错误）
  // 实际上 Judge0 会在每个测试点单独编译，但为了检测编译错误，先跑一个简单的
  const testCompile = await executeWithJudge0(code, language, "", 1000);
  if (testCompile.compile_output || (testCompile.stderr && testCompile.status !== 3)) {
    compileError = true;
    compileMessage = testCompile.compile_output || testCompile.stderr || "编译错误";
  }

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

  for (let i = 0; i < limitedTestCases.length; i++) {
    const testCase = limitedTestCases[i];
    console.log(`Running test case ${i + 1}/${limitedTestCases.length}`);
    
    try {
      const result = await executeWithJudge0(code, language, testCase.input, timeLimit);
      
      // 判断结果状态
      let testStatus = "";
      const actual = result.stdout.trim();
      const expected = testCase.output.trim();
      
      if (result.status === 3) { // 正常完成
        if (actual === expected) {
          testStatus = "ac";
          statusCounts.ac++;
          totalScore += testCase.score || 0;
        } else {
          testStatus = "wa";
          statusCounts.wa++;
          allPassed = false;
        }
      } else if (result.status === 4) { // 运行时错误
        testStatus = "re";
        statusCounts.re++;
        allPassed = false;
      } else if (result.status === 5) { // 时间超限
        testStatus = "tle";
        statusCounts.tle++;
        allPassed = false;
      } else if (result.status === 6) { // 内存超限
        testStatus = "mle";
        statusCounts.mle++;
        allPassed = false;
      } else {
        testStatus = "re";
        statusCounts.re++;
        allPassed = false;
      }
      
      testResults.push({ status: testStatus, score: testStatus === "ac" ? (testCase.score || 0) : 0 });
      
      maxTime = Math.max(maxTime, result.time);
      maxMemory = Math.max(maxMemory, result.memory);
    } catch (testError) {
      console.error(`Test case ${i + 1} error:`, testError);
      allPassed = false;
      statusCounts.re++;
      testResults.push({ status: "re", score: 0 });
    }
  }

  let finalStatus = allPassed ? "ac" : "pac";

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