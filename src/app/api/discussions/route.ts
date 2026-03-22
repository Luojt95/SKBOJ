import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取讨论列表
export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data: discussions, error } = await client
      .from("discussions")
      .select("*, users(username), problems(title)")
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: "获取讨论失败" }, { status: 500 });
    }

    return NextResponse.json({ discussions });
  } catch (error) {
    console.error("Get discussions error:", error);
    return NextResponse.json({ error: "获取讨论失败" }, { status: 500 });
  }
}

// 创建讨论
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    const client = getSupabaseClient();

    const { data: discussion, error } = await client
      .from("discussions")
      .insert({
        title: body.title,
        content: body.content,
        author_id: user.id,
        problem_id: body.problemId || null,
        parent_id: body.parentId || null,
      })
      .select("*, users(username)")
      .single();

    if (error) {
      return NextResponse.json({ error: "发布失败" }, { status: 500 });
    }

    return NextResponse.json({ discussion });
  } catch (error) {
    console.error("Create discussion error:", error);
    return NextResponse.json({ error: "发布失败" }, { status: 500 });
  }
}
