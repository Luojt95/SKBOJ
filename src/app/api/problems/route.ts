import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取题目列表
export async function GET(request: NextRequest) {
  try {
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

    // 构建查询
    let query = client
      .from("problems")
      .select("id, title, difficulty, tags, author_id, is_visible, created_at")
      .order("id", { ascending: true });

    // 如果不是管理员/站长，只显示公开的题目
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      query = query.eq("is_visible", true);
    }

    const { data: problems, error } = await query;

    if (error) {
      return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
    }

    return NextResponse.json({ problems });
  } catch (error) {
    console.error("Get problems error:", error);
    return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
  }
}

// 创建题目
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);

    // 只有管理员和站长可以创建题目
    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const body = await request.json();
    const client = getSupabaseClient();

    const { data: problem, error } = await client
      .from("problems")
      .insert({
        title: body.title,
        description: body.description,
        input_format: body.inputFormat,
        output_format: body.outputFormat,
        samples: body.samples || [],
        hint: body.hint,
        difficulty: body.difficulty || "medium",
        time_limit: body.timeLimit || 1000,
        memory_limit: body.memoryLimit || 256,
        is_visible: body.isVisible ?? true,
        author_id: user.id,
        tags: body.tags || [],
        test_cases: body.testCases || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Create problem error:", error);
      return NextResponse.json({ error: "创建题目失败" }, { status: 500 });
    }

    return NextResponse.json({ problem });
  } catch (error) {
    console.error("Create problem error:", error);
    return NextResponse.json({ error: "创建题目失败" }, { status: 500 });
  }
}
