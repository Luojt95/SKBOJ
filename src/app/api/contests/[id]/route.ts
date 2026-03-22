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
    const client = getSupabaseClient();

    // 获取比赛信息
    const { data: contest, error: contestError } = await client
      .from("contests")
      .select("*, users!contests_author_id_fkey(id, username, role)")
      .eq("id", parseInt(id))
      .single();

    if (contestError || !contest) {
      return NextResponse.json({ error: "比赛不存在" }, { status: 404 });
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
    const { data: participants } = await client
      .from("contest_participants")
      .select("*, users(username, name_color, total_rating)")
      .eq("contest_id", parseInt(id))
      .order("score", { ascending: false });

    return NextResponse.json({
      contest,
      problems,
      participants: participants || [],
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
