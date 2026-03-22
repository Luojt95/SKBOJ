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

    const { data: problem, error } = await client
      .from("problems")
      .select("*")
      .eq("id", parseInt(id))
      .single();

    if (error || !problem) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 检查权限：如果题目不可见，只有作者和管理员可以查看
    if (!problem.is_visible) {
      if (!user || (user.id !== problem.author_id && user.role !== "admin" && user.role !== "super_admin")) {
        return NextResponse.json({ error: "没有权限查看此题目" }, { status: 403 });
      }
    }

    // 不返回测试数据给普通用户
    if (!user || (user.role !== "admin" && user.role !== "super_admin" && user.id !== problem.author_id)) {
      delete problem.test_cases;
    }

    return NextResponse.json({ problem });
  } catch (error) {
    console.error("Get problem error:", error);
    return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
  }
}
