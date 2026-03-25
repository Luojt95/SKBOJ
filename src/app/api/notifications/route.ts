import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取通知列表
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // 按类型筛选
    const unreadOnly = searchParams.get("unread") === "true"; // 只获取未读
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const client = getSupabaseClient();

    let query = client
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    if (type) {
      query = query.eq("type", type);
    }

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error("Get notifications error:", error);
      return NextResponse.json({ error: "获取通知失败" }, { status: 500 });
    }

    // 获取未读数量
    const { count: unreadCount } = await client
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    return NextResponse.json({ 
      notifications: notifications || [],
      total: count || 0,
      unreadCount: unreadCount || 0
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ error: "获取通知失败" }, { status: 500 });
  }
}

// 标记通知为已读
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    const client = getSupabaseClient();

    if (body.markAll) {
      // 标记所有为已读
      const { error } = await client
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Mark all read error:", error);
        return NextResponse.json({ error: "操作失败" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } else if (body.notificationId) {
      // 标记单个为已读
      const { error } = await client
        .from("notifications")
        .update({ is_read: true })
        .eq("id", body.notificationId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Mark read error:", error);
        return NextResponse.json({ error: "操作失败" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}

// 删除通知
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const searchParams = request.nextUrl.searchParams;
    const notificationId = searchParams.get("id");
    const client = getSupabaseClient();

    if (notificationId) {
      // 删除单个通知
      const { error } = await client
        .from("notifications")
        .delete()
        .eq("id", parseInt(notificationId))
        .eq("user_id", user.id);

      if (error) {
        console.error("Delete notification error:", error);
        return NextResponse.json({ error: "删除失败" }, { status: 500 });
      }
    } else {
      // 删除所有已读通知
      const { error } = await client
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .eq("is_read", true);

      if (error) {
        console.error("Delete notifications error:", error);
        return NextResponse.json({ error: "删除失败" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
