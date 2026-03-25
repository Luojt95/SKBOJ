import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { roleLevel } from "@/lib/constants";

// 检查权限
function canEditContent(user: { id: number; role: string }, authorId: number, authorRole: string): boolean {
  if (user.id === authorId) return true;
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
    const contestId = parseInt(id);
    
    if (isNaN(contestId)) {
      return NextResponse.json({ error: "无效的比赛ID" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 获取比赛信息
    const { data: contest, error: contestError } = await client
      .from("contests")
      .select("*")
      .eq("id", contestId)
      .single();

    if (contestError) {
      console.error("Get contest error:", contestError);
      return NextResponse.json({ error: "比赛不存在", details: contestError.message }, { status: 404 });
    }

    if (!contest) {
      return NextResponse.json({ error: "比赛不存在" }, { status: 404 });
    }

    // 获取作者信息
    let author = null;
    if (contest.author_id) {
      const { data: authorData } = await client
        .from("users")
        .select("id, username, role")
        .eq("id", contest.author_id)
        .single();
      author = authorData;
    }

    // 获取比赛题目
    let problems: any[] = [];
    if (contest.problem_ids && contest.problem_ids.length > 0) {
      const { data: problemsData } = await client
        .from("problems")
        .select("id, title, difficulty, category")
        .in("id", contest.problem_ids);
      problems = problemsData || [];
    }

    // 获取参与者和排行
    const { data: participantsData, error: participantsError } = await client
      .from("contest_participants")
      .select(`
        id,
        user_id,
        score
      `)
      .eq("contest_id", contestId)
      .order("score", { ascending: false });

    if (participantsError) {
      console.error("Get participants error:", participantsError);
    }

    // 获取参与者用户信息
    let participants: any[] = [];
    if (participantsData && participantsData.length > 0) {
      const userIds = participantsData.map(p => p.user_id);
      const { data: participantsUsers } = await client
        .from("users")
        .select("id, username, role, name_color, total_rating")
        .in("id", userIds);
      
      const usersMap = new Map((participantsUsers || []).map(u => [u.id, u]));
      participants = participantsData.map(p => ({
        ...p,
        users: usersMap.get(p.user_id) || null
      }));
    }

    return NextResponse.json({
      contest: {
        ...contest,
        users: author
      },
      problems,
      participants,
    });
  } catch (error) {
    console.error("Get contest error:", error);
    return NextResponse.json({ error: "获取比赛失败" }, { status: 500 });
  }
}

// 更新比赛
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

    // 获取比赛信息
    const { data: contest, error: contestError } = await client
      .from("contests")
      .select("id, author_id")
      .eq("id", parseInt(id))
      .single();

    if (contestError || !contest) {
      console.error("Get contest for update error:", contestError);
      return NextResponse.json({ error: "比赛不存在" }, { status: 404 });
    }

    // 获取作者信息
    let authorRole = "user";
    if (contest.author_id) {
      const { data: author } = await client
        .from("users")
        .select("id, role")
        .eq("id", contest.author_id)
        .single();
      if (author) {
        authorRole = author.role;
      }
    }

    // 检查权限
    if (!canEditContent(user, contest.author_id, authorRole)) {
      return NextResponse.json({ error: "没有权限修改此比赛" }, { status: 403 });
    }

    const { data: updatedContest, error } = await client
      .from("contests")
      .update({
        title: body.title,
        description: body.description,
        start_time: body.startTime,
        end_time: body.endTime,
        type: body.type,
        problem_ids: body.problemIds,
        is_visible: body.isVisible,
      })
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    return NextResponse.json({ contest: updatedContest });
  } catch (error) {
    console.error("Update contest error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除比赛
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

    // 获取比赛和作者信息
    const { data: contest } = await client
      .from("contests")
      .select("id, author_id, users!contests_author_id_fkey(id, role)")
      .eq("id", parseInt(id))
      .single();

    if (!contest) {
      return NextResponse.json({ error: "比赛不存在" }, { status: 404 });
    }

    // 检查权限
    const authorRole = (contest.users as any)?.role || "user";
    if (!canEditContent(user, contest.author_id, authorRole)) {
      return NextResponse.json({ error: "没有权限删除此比赛" }, { status: 403 });
    }

    // 先删除参与者记录
    await client.from("contest_participants").delete().eq("contest_id", parseInt(id));
    
    // 删除比赛
    const { error } = await client
      .from("contests")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete contest error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
