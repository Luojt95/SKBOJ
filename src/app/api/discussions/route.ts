import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { checkUserPermission } from "@/lib/warning-check";

// 获取讨论列表
export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data: discussions, error } = await client
      .from("discussions")
      .select("*")
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Get discussions error:", error);
      return NextResponse.json({ error: "获取讨论失败" }, { status: 500 });
    }

    // 获取用户信息
    let discussionsWithUsers = [];
    if (discussions && discussions.length > 0) {
      const authorIds = [...new Set(discussions.map(d => d.author_id))];
      const problemIds = [...new Set(discussions.filter(d => d.problem_id).map(d => d.problem_id))];

      const { data: users } = await client
        .from("users")
        .select("id, username, role")
        .in("id", authorIds);

      const { data: problems } = problemIds.length > 0 
        ? await client.from("problems").select("id, title").in("id", problemIds)
        : { data: [] };

      const usersMap = new Map((users || []).map(u => [u.id, u]));
      const problemsMap = new Map((problems || []).map(p => [p.id, p]));

      discussionsWithUsers = discussions.map(d => ({
        ...d,
        users: usersMap.get(d.author_id) || null,
        problems: d.problem_id ? problemsMap.get(d.problem_id) || null : null
      }));
    }

    return NextResponse.json({ discussions: discussionsWithUsers });
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
    
    // 检查用户权限
    const permission = await checkUserPermission(user.id, "discussions");
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }
    
    const body = await request.json();
    const client = getSupabaseClient();

    console.log("Creating discussion with:", {
      title: body.title,
      content: body.content?.substring(0, 50),
      author_id: user.id,
      problem_id: body.problemId || null,
      parent_id: body.parentId || null,
    });

    const { data: discussion, error } = await client
      .from("discussions")
      .insert({
        title: body.title,
        content: body.content,
        author_id: user.id,
        problem_id: body.problemId || null,
        parent_id: body.parentId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create discussion error:", error);
      return NextResponse.json({ error: "发布失败", details: error.message }, { status: 500 });
    }

    // 获取用户信息
    const { data: userData } = await client
      .from("users")
      .select("id, username, role")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ 
      discussion: {
        ...discussion,
        users: userData
      }
    });
  } catch (error) {
    console.error("Create discussion error:", error);
    return NextResponse.json({ error: "发布失败" }, { status: 500 });
  }
}
