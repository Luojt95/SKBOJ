import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 默认帮助文档内容
const DEFAULT_HELP_DOC = {
  slug: "guide",
  title: "SKBOJ 使用指南",
  content: `# SKBOJ 使用指南

## 欢迎来到 SKBOJ

SKBOJ 是一个为 OIer 打造的在线评测系统，支持题目练习、在线比赛、代码调试、社区讨论等功能。

## 功能介绍

### 1. 题目练习
- 浏览题目列表，选择感兴趣的题目进行练习
- 支持多种编程语言（C++、Python等）
- 实时评测，获取详细的测试结果

### 2. 比赛
- 支持多种赛制：OI赛制、IOI赛制、CS赛制
- 参加比赛，与其他选手同台竞技
- 查看排行榜，了解排名情况

### 3. 代码调试
- 在线编写和运行代码
- 支持自定义输入测试
- 方便快速验证代码逻辑

### 4. 社区功能
- **讨论区**：与其他用户交流问题
- **分享**：分享你的优秀代码
- **题解**：查看和发布题解

### 5. Rating 系统
- 通过比赛获得 Rating
- Rating 决定用户等级和名称颜色
- 用户名颜色规则：
  - 0-500：灰色
  - 501-1000：绿色
  - 1001-1500：蓝色
  - 1501-2000：橙色
  - 2000+：红色
  - 管理员/站长：紫色

## 数学公式支持

支持 LaTeX 数学公式：

行内公式：$E = mc^2$

块级公式：
$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

## 联系我们

如有问题，请提交工单或在讨论区发帖。
`,
};

// 获取帮助文档
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get("slug") || "guide";

    const client = getSupabaseClient();
    
    try {
      const { data: doc, error } = await client
        .from("help_docs")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!error && doc) {
        return NextResponse.json({ doc });
      }
    } catch (dbError) {
      // 数据库表不存在或查询失败，使用默认内容
      console.log("Help docs table not available, using default content");
    }

    // 返回默认内容
    return NextResponse.json({ doc: DEFAULT_HELP_DOC });
  } catch (error) {
    console.error("Get help doc error:", error);
    return NextResponse.json({ doc: DEFAULT_HELP_DOC });
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

    try {
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
        // 如果是表不存在的错误，返回提示
        if (error.code === "42P01") {
          return NextResponse.json({ 
            error: "帮助文档表尚未创建，请联系管理员在数据库中创建 help_docs 表",
            doc: { slug, title, content }
          }, { status: 500 });
        }
        return NextResponse.json({ error: "更新失败" }, { status: 500 });
      }

      return NextResponse.json({ doc });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ 
        error: "数据库表不存在，无法保存。请联系管理员创建 help_docs 表。",
        doc: { slug, title, content }
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Update help doc error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
