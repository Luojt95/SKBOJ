import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 整理题号 - 按题库分类重新编号
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);

    // 只有管理员和站长可以整理题号
    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限整理题号" }, { status: 403 });
    }

    const client = getSupabaseClient();

    // 获取所有题目
    const { data: problems, error: getError } = await client
      .from("problems")
      .select("id, category, created_at")
      .order("category", { ascending: true })
      .order("created_at", { ascending: true });

    if (getError) {
      console.error("Get problems error:", getError);
      return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
    }

    if (!problems || problems.length === 0) {
      return NextResponse.json({ success: true, updatedCount: 0 });
    }

    // 按题库分组
    const problemsByCategory: Record<string, typeof problems> = {};
    for (const problem of problems) {
      const category = problem.category || "P";
      if (!problemsByCategory[category]) {
        problemsByCategory[category] = [];
      }
      problemsByCategory[category].push(problem);
    }

    // 更新每个题库的题目题号
    let updatedCount = 0;
    for (const [category, categoryProblems] of Object.entries(problemsByCategory)) {
      // 按创建时间排序
      categoryProblems.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // 为每个题库内的题目重新编号（1, 2, 3...）
      for (let i = 0; i < categoryProblems.length; i++) {
        const problem = categoryProblems[i];
        const newNumber = i + 1;

        // 更新题目的 category_prefix（如果存在这个字段）
        // 由于 category 已经是题库标识，我们需要一个单独的字段来存储题库内的序号
        // 假设 problems 表有 category_index 字段来存储题库内的序号
        const { error: updateError } = await client
          .from("problems")
          .update({ 
            category_index: newNumber,
            updated_at: new Date().toISOString()
          })
          .eq("id", problem.id);

        if (!updateError) {
          updatedCount++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      updatedCount,
      message: `已整理 ${updatedCount} 道题目`
    });
  } catch (error) {
    console.error("Reorder problems error:", error);
    return NextResponse.json({ error: "整理失败" }, { status: 500 });
  }
}
