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

    // 检查题目是否在OI赛制的比赛中
    const { data: contests } = await client
      .from("contests")
      .select("id, type, start_time, end_time, problem_ids")
      .contains("problem_ids", [problemId]);

    let oiContestInfo: { id: number; isOngoing: boolean } | null = null;
    if (contests && contests.length > 0) {
      const relatedContest = contests.find(c => c.problem_ids.includes(problemId));
      if (relatedContest && relatedContest.type === "oi") {
        const now = new Date();
        const endTime = new Date(relatedContest.end_time);
        oiContestInfo = {
          id: relatedContest.id,
          isOngoing: now <= endTime
        };
      }
    }

    // 获取题目信息，判断当前用户是否是出题人或管理员
    const { data: problem } = await client
      .from("problems")
      .select("author_id")
      .eq("id", problemId)
      .single();

    const isAdmin = currentUser.role === "super_admin" || currentUser.role === "admin";
    const isAuthor = problem && problem.author_id === currentUser.id;
    const isAuthorOrAdmin = isAdmin || isAuthor;

    // 构建查询
    let query = client
      .from("submissions")
      .select("*")
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

    // 获取用户信息
    let submissionsWithUsers = [];
    if (submissions && submissions.length > 0) {
      const userIds = [...new Set(submissions.map(s => s.user_id))];
      const { data: users } = await client
        .from("users")
        .select("id, username, role")
        .in("id", userIds);
      
      const usersMap = new Map((users || []).map(u => [u.id, u]));
      
      submissionsWithUsers = submissions.map(s => {
        // OI赛制处理：比赛进行中隐藏评测结果
        // 只隐藏非管理员/非出题人的提交
        const isOIHidden = oiContestInfo?.isOngoing && 
                          s.contest_id === oiContestInfo.id &&
                          !isAdmin && !isAuthor;
        
        if (isOIHidden) {
          return {
            ...s,
            status: "hidden",
            display_status: "???",
            score: null,
            time_used: null,
            memory_used: null,
            users: usersMap.get(s.user_id) || null
          };
        }
        
        return {
          ...s,
          users: usersMap.get(s.user_id) || null
        };
      });
    }

    return NextResponse.json({ submissions: submissionsWithUsers });
  } catch (error) {
    console.error("Get submissions error:", error);
    return NextResponse.json({ submissions: [] });
  }
}
