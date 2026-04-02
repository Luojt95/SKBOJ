import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取帮助文档
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get("slug") || "guide";

    const client = getSupabaseClient();
    const { data: doc, error } = await client
      .from("help_docs")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !doc) {
      // 如果没有找到，返回默认内容
      return NextResponse.json({
        doc: {
          slug: "guide",
          title: "帮助中心",
          content: "# 帮助中心\n\n暂无帮助内容，请联系站长添加。",
        },
      });
    }

    return NextResponse.json({ doc });
  } catch (error) {
    console.error("Get help doc error:", error);
    return NextResponse.json({ error: "获取帮助文档失败" }, { status: 500 });
  }
}

// 更新帮助文档（仅站长可操作）
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);

    // 只有站长可以编辑帮助文档
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "只有站长可以编辑帮助文档" }, { status: 403 });
    }

    const body = await request.json();
    const { slug, title, content } = body;

    if (!slug || !title || !content) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 使用 upsert 插入或更新
    const { data: doc, error } = await client
      .from("help_docs")
      .upsert({
        slug,
        title,
        content,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }, { onConflict: "slug" })
      .select()
      .single();

    if (error) {
      console.error("Update help doc error:", error);
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    return NextResponse.json({ doc });
  } catch (error) {
    console.error("Update help doc error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
