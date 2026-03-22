import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

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
      .select("*")
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
        .select("id, title, difficulty")
        .in("id", contest.problem_ids);
      problems = problemsData || [];
    }

    // 获取参与者和排行
    const { data: participants } = await client
      .from("contest_participants")
      .select("*, users(username)")
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
