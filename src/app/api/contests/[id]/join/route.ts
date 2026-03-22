import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(
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

    // 检查比赛是否存在且正在进行
    const { data: contest } = await client
      .from("contests")
      .select("*")
      .eq("id", parseInt(id))
      .single();

    if (!contest) {
      return NextResponse.json({ error: "比赛不存在" }, { status: 404 });
    }

    // 检查是否已参与
    const { data: existing } = await client
      .from("contest_participants")
      .select("id")
      .eq("contest_id", parseInt(id))
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "已参与此比赛" }, { status: 400 });
    }

    // 加入比赛
    const { error } = await client.from("contest_participants").insert({
      contest_id: parseInt(id),
      user_id: user.id,
    });

    if (error) {
      return NextResponse.json({ error: "加入失败" }, { status: 500 });
    }

    // 返回更新后的参与者列表
    const { data: participants } = await client
      .from("contest_participants")
      .select("*, users(username)")
      .eq("contest_id", parseInt(id));

    return NextResponse.json({ participants });
  } catch (error) {
    console.error("Join contest error:", error);
    return NextResponse.json({ error: "加入失败" }, { status: 500 });
  }
}
