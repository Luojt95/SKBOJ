import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { roleLevel } from "@/lib/constants";

// 获取工单详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = parseInt(id);

    if (isNaN(ticketId)) {
      return NextResponse.json({ error: "无效的工单ID" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 获取工单信息
    const { data: ticket, error } = await client
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: "工单不存在" }, { status: 404 });
    }

    // 获取作者信息
    let author = null;
    if (ticket.author_id) {
      const { data: authorData } = await client
        .from("users")
        .select("id, username, role")
        .eq("id", ticket.author_id)
        .single();
      author = authorData;
    }

    // 获取关联题目
    let problem = null;
    if (ticket.problem_id) {
      const { data: problemData } = await client
        .from("problems")
        .select("id, title")
        .eq("id", ticket.problem_id)
        .single();
      problem = problemData;
    }

    return NextResponse.json({
      ticket: {
        ...ticket,
        users: author,
        problems: problem
      }
    });
  } catch (error) {
    console.error("Get ticket error:", error);
    return NextResponse.json({ error: "获取工单失败" }, { status: 500 });
  }
}

// 更新工单状态
export async function PATCH(
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

    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const body = await request.json();
    const client = getSupabaseClient();

    const { data: ticket, error } = await client
      .from("tickets")
      .update({
        status: body.status,
        reply: body.reply || null,
        handler_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) {
      console.error("Update ticket error:", error);
      return NextResponse.json({ error: "处理失败" }, { status: 500 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Update ticket error:", error);
    return NextResponse.json({ error: "处理失败" }, { status: 500 });
  }
}

// 删除工单
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

    // 获取工单信息
    const { data: ticket } = await client
      .from("tickets")
      .select("id, author_id")
      .eq("id", parseInt(id))
      .single();

    if (!ticket) {
      return NextResponse.json({ error: "工单不存在" }, { status: 404 });
    }

    // 获取作者信息
    const { data: authorData } = await client
      .from("users")
      .select("id, role")
      .eq("id", ticket.author_id)
      .single();

    // 检查权限
    const authorRole = authorData?.role || "user";
    const userLevel = roleLevel[user.role] || 0;
    const authorLevel = roleLevel[authorRole] || 0;

    if (user.id !== ticket.author_id && userLevel < authorLevel) {
      return NextResponse.json({ error: "没有权限删除此工单" }, { status: 403 });
    }

    const { error } = await client
      .from("tickets")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete ticket error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
