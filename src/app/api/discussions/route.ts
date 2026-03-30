import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { checkUserPoints, deductUserPoints } from "@/lib/warning-check";

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
    const body = await request.json();
    
    // 检查积分（发布讨论需要20积分）
    const pointsCheck = await checkUserPoints(user.id, "discussions");
    if (!pointsCheck.allowed) {
      return NextResponse.json({ error: pointsCheck.reason }, { status: 403 });
    }
    
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

    // 扣除积分并获取新积分
    const isReply = body.parentId != null;
    const deductResult = await deductUserPoints(
      user.id,
      isReply ? "discussion_reply" : "discussions",
      discussion.id
    );

    // 更新 cookie 中的积分
    if (deductResult.success && deductResult.newPoints !== undefined) {
      const cookieStore = await cookies();
      cookieStore.set(
        "user",
        JSON.stringify({
          ...user,
          points: deductResult.newPoints === Infinity ? undefined : deductResult.newPoints,
        }),
        {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        }
      );
    }

    // 获取用户信息
    const { data: userData } = await client
      .from("users")
      .select("id, username, role, points")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ 
      discussion: {
        ...discussion,
        users: userData
      },
      newPoints: deductResult.newPoints
    });
  } catch (error) {
    console.error("Create discussion error:", error);
    return NextResponse.json({ error: "发布失败" }, { status: 500 });
  }
}
