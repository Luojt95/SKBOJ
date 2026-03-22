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
      .select("*, users(username), problems(title)")
      .order("created_at", { ascending: false });

    // 普通用户只能看到自己的工单
    if (userCookie) {
      const user = JSON.parse(userCookie.value);
      if (user.role !== "admin" && user.role !== "super_admin") {
        query = query.eq("author_id", user.id);
      }
    }

    const { data: tickets, error } = await query;

    if (error) {
      return NextResponse.json({ error: "获取失败" }, { status: 500 });
    }

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Get tickets error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
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
      })
      .select("*, users(username)")
      .single();

    if (error) {
      return NextResponse.json({ error: "提交失败" }, { status: 500 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Create ticket error:", error);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
