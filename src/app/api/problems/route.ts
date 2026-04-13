import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { checkDailyLimit, updateDailyLimit } from "@/lib/daily-limits";

// 获取题目列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");
    const { searchParams } = new URL(request.url);

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
      .select("id, title, difficulty, category, category_index, author_id, is_visible, created_at")
      .order("category", { ascending: true })
      .order("category_index", { ascending: true })
      .order("created_at", { ascending: true });

    // 如果不是管理员/站长，只显示公开的题目
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      query = query.eq("is_visible", true);
    }

    const { data: problems, error } = await query;

    if (error) {
      return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
    }

    // 获取所有题目的标签
    const problemIds = (problems || []).map(p => p.id);
    const { data: problemTags } = await client
      .from("problem_tags")
      .select("problem_id, tag_id, tags(name, color)")
      .in("problem_id", problemIds);

    // 构建题目 -> 标签映射
    const tagsMap: Record<number, { id: number; name: string; color: string }[]> = {};
    (problemTags || []).forEach(pt => {
      if (!tagsMap[pt.problem_id]) {
        tagsMap[pt.problem_id] = [];
      }
      if (pt.tags && Array.isArray(pt.tags)) {
        // tags 是关联查询返回的数组，取第一个元素
        const tagData = pt.tags[0];
        if (tagData && tagData.name && tagData.color) {
          tagsMap[pt.problem_id].push({
            id: pt.tag_id,
            name: tagData.name,
            color: tagData.color,
          });
        }
      }
    });

    // 获取所有题目的提交统计
    const { data: submissionStats } = await client
      .from("submissions")
      .select("problem_id, status")
      .in("problem_id", problemIds);

    // 计算每个题目的提交数和通过数
    const statsMap: Record<number, { total: number; accepted: number }> = {};
    (submissionStats || []).forEach(s => {
      if (!statsMap[s.problem_id]) {
        statsMap[s.problem_id] = { total: 0, accepted: 0 };
      }
      statsMap[s.problem_id].total++;
      if (s.status === "ac") {
        statsMap[s.problem_id].accepted++;
      }
    });

    // 获取URL中的标签过滤参数
    const selectedTags = searchParams.get("tags")?.split(",").filter(Boolean).map(Number) || [];

    // 合并统计信息和标签到题目数据
    let problemsWithStats = (problems || []).map(p => ({
      ...p,
      tags: tagsMap[p.id] || [],
      submission_count: statsMap[p.id]?.total || 0,
      accepted_count: statsMap[p.id]?.accepted || 0,
    }));

    // 如果有标签过滤条件，只返回包含全部选中标签的题目
    if (selectedTags.length > 0) {
      problemsWithStats = problemsWithStats.filter(p => {
        const problemTagIds = p.tags.map((t: { id: number }) => t.id);
        return selectedTags.every(tagId => problemTagIds.includes(tagId));
      });
    }

    return NextResponse.json({ problems: problemsWithStats });
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

    // 检查每日限制（管理员限制3道，站长不受限制）
    if (user.role === "admin") {
      const limitCheck = await checkDailyLimit(user.id, "problems_created", 3);
      if (!limitCheck.allowed) {
        return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
      }
    }

    const body = await request.json();
    const client = getSupabaseClient();

    // 验证必填字段
    if (!body.title || !body.description) {
      return NextResponse.json({ error: "标题和描述不能为空" }, { status: 400 });
    }

    // 验证时间限制和内存限制
    const timeLimit = Math.min(10000, Math.max(1, parseInt(body.timeLimit) || 1000));
    const memoryLimit = Math.min(1024, Math.max(1, parseInt(body.memoryLimit) || 256));

    // 获取该题库当前最大的 category_index
    const category = body.category || "P";
    const { data: maxIndexData } = await client
      .from("problems")
      .select("category_index")
      .eq("category", category)
      .order("category_index", { ascending: false })
      .limit(1);
    
    const maxIndex = maxIndexData && maxIndexData.length > 0 ? (maxIndexData[0].category_index || 0) : 0;
    const newCategoryIndex = (maxIndex || 0) + 1;

    const { data: problem, error } = await client
      .from("problems")
      .insert({
        title: body.title,
        description: body.description,
        input_format: body.inputFormat || "",
        output_format: body.outputFormat || "",
        samples: body.samples || [],
        hint: body.hint || "",
        category: category,
        category_index: newCategoryIndex,
        difficulty: body.difficulty || "popular",
        time_limit: timeLimit,
        memory_limit: memoryLimit,
        is_visible: body.isVisible ?? true,
        author_id: user.id,
        tags: body.tags || [],
        test_cases: body.testCases || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Create problem error:", error);
      return NextResponse.json({ error: "创建题目失败: " + (error.message || "数据库错误") }, { status: 500 });
    }

    // 添加题目标签关联
    if (body.tagIds && Array.isArray(body.tagIds) && body.tagIds.length > 0) {
      const problemTagRecords = body.tagIds.map((tagId: number) => ({
        problem_id: problem.id,
        tag_id: tagId,
      }));
      
      await client
        .from("problem_tags")
        .insert(problemTagRecords);
    }

    // 更新每日限制（管理员需要更新，站长不需要）
    if (user.role === "admin") {
      await updateDailyLimit(user.id, "problems_created");
    }

    return NextResponse.json({ problem });
  } catch (error) {
    console.error("Create problem error:", error);
    return NextResponse.json({ error: "创建题目失败: " + ((error as Error).message || "未知错误") }, { status: 500 });
  }
}
