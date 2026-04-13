import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { roleLevel } from "@/lib/constants";

// 检查权限：用户是否可以编辑目标内容
function canEditContent(user: { id: number; role: string }, authorId: number, authorRole: string): boolean {
  // 是自己的内容
  if (user.id === authorId) return true;
  // 权限等级比较
  const userLevel = roleLevel[user.role] || 0;
  const authorLevel = roleLevel[authorRole] || 0;
  return userLevel >= authorLevel;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // 获取URL中的contest参数
    const { searchParams } = new URL(request.url);
    const contestId = searchParams.get("contest");

    // 先获取题目
    const { data: problem, error } = await client
      .from("problems")
      .select("*")
      .eq("id", parseInt(id))
      .single();

    if (error || !problem) {
      console.error("Get problem error:", error);
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 获取作者信息
    const { data: author } = await client
      .from("users")
      .select("id, username, role")
      .eq("id", problem.author_id)
      .single();

    problem.author = author;

    // 如果URL中有contest参数，直接获取对应比赛
    let contest = null;
    if (contestId) {
      const { data: contestData } = await client
        .from("contests")
        .select("id, title, start_time, end_time, type, problem_ids, author_id")
        .eq("id", parseInt(contestId))
        .single();
      contest = contestData;
    }
    
    // 如果找到了比赛，检查题目是否在比赛题目列表中
    const problemIdNum = parseInt(id);
    if (contest && contest.problem_ids) {
      const problemInContest = contest.problem_ids.includes(problemIdNum);
      if (!problemInContest) {
        contest = null; // 题目不在这个比赛的题目列表中
      }
    }
    
    const isInContest = contest !== null;

    // 如果题目在比赛中，需要特殊处理访问权限
    if (isInContest && contest) {
      const now = new Date();
      const startTime = new Date(contest.start_time);
      const endTime = new Date(contest.end_time);
      const isContestOngoing = now >= startTime && now <= endTime;
      const isContestEnded = now > endTime;

      // 如果是管理员或比赛创建者，允许访问
      const isAdmin = user && (user.role === "admin" || user.role === "super_admin");
      const isContestAuthor = user && user.id === contest.author_id;

      if (!isAdmin && !isContestAuthor) {
        // 检查用户是否是比赛参与者
        let isParticipant = false;
        if (user) {
          const { data: participation } = await client
            .from("contest_participants")
            .select("id")
            .eq("contest_id", contest.id)
            .eq("user_id", user.id)
            .single();
          isParticipant = !!participation;
        }

        // 比赛未开始：不能访问
        if (now < startTime) {
          return NextResponse.json({ 
            error: "比赛尚未开始，题目暂时不可访问",
            contest: { id: contest.id, title: contest.title, start_time: contest.start_time }
          }, { status: 403 });
        }

        // 比赛进行中：只有参赛者可以访问
        if (isContestOngoing && !isParticipant) {
          return NextResponse.json({ 
            error: "请先参加比赛后再访问题目",
            contest: { id: contest.id, title: contest.title }
          }, { status: 403 });
        }
        // 比赛已结束：所有人都可以访问
      }

      // 添加比赛信息到题目数据
      problem.contest = {
        id: contest.id,
        title: contest.title,
        type: contest.type,
        is_ongoing: isContestOngoing,
        is_ended: isContestEnded,
      };
    } else {
      // 题目不在比赛中，检查普通可见权限
      if (!problem.is_visible) {
        if (!user || (user.id !== problem.author_id && user.role !== "admin" && user.role !== "super_admin")) {
          return NextResponse.json({ error: "没有权限查看此题目" }, { status: 403 });
        }
      }
    }

    // 不返回测试数据给普通用户
    if (!user || (user.role !== "admin" && user.role !== "super_admin" && user.id !== problem.author_id)) {
      delete problem.test_cases;
    }

    // 获取题目的标签
    const { data: problemTags } = await client
      .from("problem_tags")
      .select("tag_id, tags(name, color)")
      .eq("problem_id", parseInt(id));
    
    problem.tags = (problemTags || []).map(pt => pt.tags).filter(Boolean);

    // 获取提交统计
    const { data: submissionStats } = await client
      .from("submissions")
      .select("status")
      .eq("problem_id", parseInt(id));

    const totalSubmissions = submissionStats?.length || 0;
    const acceptedSubmissions = submissionStats?.filter(s => s.status === "ac").length || 0;

    problem.submission_count = totalSubmissions;
    problem.accepted_count = acceptedSubmissions;

    return NextResponse.json({ problem });
  } catch (error) {
    console.error("Get problem error:", error);
    return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
  }
}

// 更新题目
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();
    const body = await request.json();

    // 获取题目
    const { data: problem } = await client
      .from("problems")
      .select("id, author_id")
      .eq("id", parseInt(id))
      .single();

    if (!problem) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 获取作者信息
    const { data: author } = await client
      .from("users")
      .select("role")
      .eq("id", problem.author_id)
      .single();

    // 检查权限
    const authorRole = author?.role || "user";
    if (!canEditContent(user, problem.author_id, authorRole)) {
      return NextResponse.json({ error: "没有权限修改此题目" }, { status: 403 });
    }

    // 验证时间限制和内存限制
    const timeLimit = Math.min(10000, Math.max(1, parseInt(body.timeLimit) || 1000));
    const memoryLimit = Math.min(1024, Math.max(1, parseInt(body.memoryLimit) || 256));

    const { data: updatedProblem, error } = await client
      .from("problems")
      .update({
        title: body.title,
        description: body.description,
        input_format: body.inputFormat,
        output_format: body.outputFormat,
        samples: body.samples,
        hint: body.hint,
        category: body.category,
        difficulty: body.difficulty,
        time_limit: timeLimit,
        memory_limit: memoryLimit,
        is_visible: body.isVisible,
        test_cases: body.testCases,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) {
      console.error("Update problem error:", error);
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    // 更新标签关联
    if (body.tagIds !== undefined) {
      // 删除旧的关联
      await client
        .from("problem_tags")
        .delete()
        .eq("problem_id", parseInt(id));

      // 插入新的关联
      if (body.tagIds.length > 0) {
        const tagInserts = body.tagIds.map((tagId: number) => ({
          problem_id: parseInt(id),
          tag_id: tagId,
        }));
        await client.from("problem_tags").insert(tagInserts);
      }
    }

    return NextResponse.json({ problem: updatedProblem });
  } catch (error) {
    console.error("Update problem error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除题目
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();

    // 获取题目
    const { data: problem } = await client
      .from("problems")
      .select("id, author_id")
      .eq("id", parseInt(id))
      .single();

    if (!problem) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 获取作者信息
    const { data: author } = await client
      .from("users")
      .select("role")
      .eq("id", problem.author_id)
      .single();

    // 检查权限
    const authorRole = author?.role || "user";
    if (!canEditContent(user, problem.author_id, authorRole)) {
      return NextResponse.json({ error: "没有权限删除此题目" }, { status: 403 });
    }

    const { error } = await client
      .from("problems")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete problem error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
