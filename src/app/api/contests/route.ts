import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取比赛列表
export async function GET() {
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

    let query = client
      .from("contests")
      .select("*")
      .order("start_time", { ascending: false });

    // 非管理员只能看到公开的比赛
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      query = query.eq("is_visible", true);
    }

    const { data: contests, error } = await query;

    if (error) {
      return NextResponse.json({ error: "获取比赛失败" }, { status: 500 });
    }

    return NextResponse.json({ contests });
  } catch (error) {
    console.error("Get contests error:", error);
    return NextResponse.json({ error: "获取比赛失败" }, { status: 500 });
  }
}

// 创建比赛
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);

    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const body = await request.json();
    const client = getSupabaseClient();

    const { data: contest, error } = await client
      .from("contests")
      .insert({
        title: body.title,
        description: body.description,
        start_time: body.startTime,
        end_time: body.endTime,
        type: body.type || "oi",
        format: body.format || "OI", // 赛制: OI, IOI, CS
        admin_threshold: body.format === "CS" ? body.adminThreshold : null, // CS赛制门槛
        problem_ids: body.problemIds || [],
        author_id: user.id,
        is_visible: body.isVisible ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("Create contest error:", error);
      return NextResponse.json({ error: "创建比赛失败" }, { status: 500 });
    }

    return NextResponse.json({ contest });
  } catch (error) {
    console.error("Create contest error:", error);
    return NextResponse.json({ error: "创建比赛失败" }, { status: 500 });
  }
}
