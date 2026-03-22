import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { roleLevel } from "@/lib/constants";

// 检查权限：用户是否可以编辑目标内容
function canEditContent(user: { id: number; role: string }, authorId: number, authorRole: string): boolean {
  // 是自己的内容
  if (user.id === authorId) return true;
  // 权限等级比较
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
      .select("*, users!problems_author_id_fkey(id, username, role)")
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

// 更新题目
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

    // 获取题目和作者信息
    const { data: problem } = await client
      .from("problems")
      .select("id, author_id, users!problems_author_id_fkey(id, role)")
      .eq("id", parseInt(id))
      .single();

    if (!problem) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 检查权限
    const authorRole = (problem.users as any)?.role || "user";
    if (!canEditContent(user, problem.author_id, authorRole)) {
      return NextResponse.json({ error: "没有权限修改此题目" }, { status: 403 });
    }

    const { data: updatedProblem, error } = await client
      .from("problems")
      .update({
        title: body.title,
        description: body.description,
        input_format: body.inputFormat,
        output_format: body.outputFormat,
        samples: body.samples,
        hint: body.hint,
        category: body.category,
        difficulty: body.difficulty,
        time_limit: body.timeLimit,
        memory_limit: body.memoryLimit,
        is_visible: body.isVisible,
        tags: body.tags,
        test_cases: body.testCases,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) {
      console.error("Update problem error:", error);
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    return NextResponse.json({ problem: updatedProblem });
  } catch (error) {
    console.error("Update problem error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除题目
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

    // 获取题目和作者信息
    const { data: problem } = await client
      .from("problems")
      .select("id, author_id, users!problems_author_id_fkey(id, role)")
      .eq("id", parseInt(id))
      .single();

    if (!problem) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // 检查权限
    const authorRole = (problem.users as any)?.role || "user";
    if (!canEditContent(user, problem.author_id, authorRole)) {
      return NextResponse.json({ error: "没有权限删除此题目" }, { status: 403 });
    }

    const { error } = await client
      .from("problems")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete problem error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
