import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取工单列表
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");
    const client = getSupabaseClient();

    let query = client
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    // 普通用户只能看到自己的工单
    let user = null;
    if (userCookie) {
      try {
        user = JSON.parse(userCookie.value);
        if (user.role !== "admin" && user.role !== "super_admin") {
          query = query.eq("author_id", user.id);
        }
      } catch {}
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error("Get tickets error:", error);
      return NextResponse.json({ tickets: [] });
    }

    // 获取作者信息
    const authorIds = [...new Set(tickets?.map(t => t.author_id) || [])];
    const { data: users } = await client
      .from("users")
      .select("id, username")
      .in("id", authorIds);

    const userMap = new Map(users?.map(u => [u.id, u.username]) || []);

    // 获取题目信息
    const problemIds = [...new Set(tickets?.filter(t => t.problem_id).map(t => t.problem_id) || [])];
    const { data: problems } = await client
      .from("problems")
      .select("id, title")
      .in("id", problemIds);

    const problemMap = new Map(problems?.map(p => [p.id, p.title]) || []);

    const ticketsWithInfo = tickets?.map(t => ({
      ...t,
      users: { username: userMap.get(t.author_id) || `用户${t.author_id}` },
      problems: t.problem_id ? { title: problemMap.get(t.problem_id) || `题目${t.problem_id}` } : null
    })) || [];

    return NextResponse.json({ tickets: ticketsWithInfo });
  } catch (error) {
    console.error("Get tickets error:", error);
    return NextResponse.json({ tickets: [] });
  }
}

// 创建工单
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

    const { data: ticket, error } = await client
      .from("tickets")
      .insert({
        title: body.title,
        content: body.content,
        type: body.type,
        author_id: user.id,
        problem_id: body.problemId || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Create ticket error:", error);
      return NextResponse.json({ error: "提交失败: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Create ticket error:", error);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
