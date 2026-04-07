import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { checkUserPoints, deductUserPoints } from "@/lib/warning-check";
import { checkUserCanPerformAction } from "@/lib/permission-check";
import { checkDailyLimit, updateDailyLimit } from "@/lib/daily-limits";

// 获取私信列表（会话列表）
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const searchParams = request.nextUrl.searchParams;
    const withUserId = searchParams.get("with"); // 与某用户的聊天记录
    const client = getSupabaseClient();

    if (withUserId) {
      // 获取与特定用户的聊天记录
      const targetId = parseInt(withUserId);
      const { data: messages, error } = await client
        .from("private_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) {
        console.error("Get messages error:", error);
        return NextResponse.json({ error: "获取消息失败" }, { status: 500 });
      }

      // 获取对方用户信息
      const { data: otherUser } = await client
        .from("users")
        .select("id, username, role, name_color")
        .eq("id", targetId)
        .single();

      // 标记对方发来的消息为已读
      await client
        .from("private_messages")
        .update({ is_read: true })
        .eq("sender_id", targetId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      return NextResponse.json({ 
        messages: messages || [],
        otherUser
      });
    } else {
      // 获取会话列表
      // 查询与每个用户的最新消息
      const { data: sentMessages } = await client
        .from("private_messages")
        .select("*")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false });

      const { data: receivedMessages } = await client
        .from("private_messages")
        .select("*")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false });

      // 合并并按用户分组，取最新消息
      const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];
      const conversationMap = new Map<number, typeof allMessages[0]>();

      for (const msg of allMessages) {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!conversationMap.has(otherId) || 
            new Date(msg.created_at) > new Date(conversationMap.get(otherId)!.created_at)) {
          conversationMap.set(otherId, msg);
        }
      }

      // 获取用户信息
      const userIds = Array.from(conversationMap.keys());
      let conversations: any[] = [];

      if (userIds.length > 0) {
        const { data: users } = await client
          .from("users")
          .select("id, username, role, name_color")
          .in("id", userIds);

        const usersMap = new Map((users || []).map(u => [u.id, u]));

        // 获取每个会话的未读消息数
        const { data: unreadCounts } = await client
          .from("private_messages")
          .select("sender_id")
          .eq("receiver_id", user.id)
          .eq("is_read", false);

        const unreadMap = new Map<number, number>();
        for (const item of (unreadCounts || [])) {
          unreadMap.set(item.sender_id, (unreadMap.get(item.sender_id) || 0) + 1);
        }

        conversations = Array.from(conversationMap.entries()).map(([userId, lastMsg]) => ({
          user: usersMap.get(userId) || { id: userId, username: "未知用户" },
          lastMessage: lastMsg,
          unreadCount: unreadMap.get(userId) || 0
        }));

        // 按最新消息排序
        conversations.sort((a, b) => 
          new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
        );
      }

      return NextResponse.json({ conversations });
    }
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ error: "获取消息失败" }, { status: 500 });
  }
}

// 发送私信
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    const { receiverId, content } = body;

    if (!receiverId || !content) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    if (receiverId === user.id) {
      return NextResponse.json({ error: "不能给自己发私信" }, { status: 400 });
    }

    // 检查是否被禁言
    const banCheck = await checkUserCanPerformAction(user.id, "message");
    if (!banCheck.canPerform) {
      return NextResponse.json({ error: banCheck.message }, { status: 403 });
    }

    // 检查每日限制（发送私信）
    const limitCheck = await checkDailyLimit(user.id, "messages_sent", 5);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }

    // 检查积分
    const pointsCheck = await checkUserPoints(user.id, "messages");
    if (!pointsCheck.allowed) {
      return NextResponse.json({ error: pointsCheck.reason }, { status: 403 });
    }

    const client = getSupabaseClient();

    // 检查接收者是否存在
    const { data: receiver } = await client
      .from("users")
      .select("id, username")
      .eq("id", receiverId)
      .single();

    if (!receiver) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 创建消息
    const { data: message, error } = await client
      .from("private_messages")
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error("Send message error:", error);
      return NextResponse.json({ error: "发送失败" }, { status: 500 });
    }

    // 扣除积分
    await deductUserPoints(user.id, "messages", message.id);

    // 更新每日限制
    await updateDailyLimit(user.id, "messages_sent");

    // 获取发送者信息
    const { data: sender } = await client
      .from("users")
      .select("id, username, role, name_color")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ 
      message: {
        ...message,
        sender
      }
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}

// 删除私信会话
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const searchParams = request.nextUrl.searchParams;
    const withUserId = searchParams.get("with");
    const client = getSupabaseClient();

    if (!withUserId) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const targetId = parseInt(withUserId);

    // 删除与该用户的所有消息（只删除自己发送的或接收的）
    const { error } = await client
      .from("private_messages")
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${user.id})`);

    if (error) {
      console.error("Delete messages error:", error);
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete messages error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
