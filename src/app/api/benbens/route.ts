import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { checkUserPermission } from "@/lib/warning-check";

// 获取犇犇列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId"); // 指定用户的犇犇
    const following = searchParams.get("following"); // 关注的人的犇犇
    const parentId = searchParams.get("parentId"); // 回复列表
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const client = getSupabaseClient();

    let query = client
      .from("benbens")
      .select("*", { count: "exact" });

    // 获取主题犇犇还是回复
    if (parentId) {
      // 获取指定犇犇的回复
      query = query.eq("parent_id", parseInt(parentId));
    } else {
      // 只获取主题犇犇
      query = query.is("parent_id", null);
    }

    // 获取关注的人的犇犇
    if (following === "true") {
      const cookieStore = await cookies();
      const userCookie = cookieStore.get("user");
      if (userCookie) {
        const user = JSON.parse(userCookie.value);
        const { data: follows } = await client
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);
        
        if (follows && follows.length > 0) {
          const followingIds = follows.map(f => f.following_id);
          followingIds.push(user.id); // 也包括自己的
          query = query.in("author_id", followingIds);
        } else {
          // 没有关注任何人，只显示自己的
          query = query.eq("author_id", user.id);
        }
      }
    } else if (userId) {
      // 指定用户的犇犇
      query = query.eq("author_id", parseInt(userId));
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: benbens, error, count } = await query;

    if (error) {
      console.error("Get benbens error:", error);
      return NextResponse.json({ error: "获取犇犇失败" }, { status: 500 });
    }

    // 获取用户信息
    let benbensWithUsers = [];
    if (benbens && benbens.length > 0) {
      const authorIds = [...new Set(benbens.map(b => b.author_id))];
      const replyToUserIds = benbens.filter(b => b.reply_to_user_id).map(b => b.reply_to_user_id);
      const allUserIds = [...new Set([...authorIds, ...replyToUserIds])];

      const { data: users } = await client
        .from("users")
        .select("id, username, role, name_color")
        .in("id", allUserIds);

      const usersMap = new Map((users || []).map(u => [u.id, u]));

      benbensWithUsers = benbens.map(b => ({
        ...b,
        author: usersMap.get(b.author_id) || null,
        replyToUser: b.reply_to_user_id ? usersMap.get(b.reply_to_user_id) || null : null
      }));
    }

    return NextResponse.json({ 
      benbens: benbensWithUsers,
      total: count || 0
    });
  } catch (error) {
    console.error("Get benbens error:", error);
    return NextResponse.json({ error: "获取犇犇失败" }, { status: 500 });
  }
}

// 创建犇犇
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    
    // 检查用户权限
    const permission = await checkUserPermission(user.id, "benbens");
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }
    
    const body = await request.json();
    const client = getSupabaseClient();

    // 解析@提及的用户
    const mentionRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(body.content)) !== null) {
      mentions.push(match[1]);
    }

    const { data: benben, error } = await client
      .from("benbens")
      .insert({
        content: body.content,
        author_id: user.id,
        parent_id: body.parentId || null,
        reply_to_id: body.replyToId || null,
        reply_to_user_id: body.replyToUserId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create benben error:", error);
      return NextResponse.json({ error: "发布失败" }, { status: 500 });
    }

    // 更新父犇犇的回复数
    if (body.parentId) {
      await client
        .from("benbens")
        .update({ 
          reply_count: client.rpc("increment_reply_count", { id: body.parentId }) 
        })
        .eq("id", body.parentId);
    }

    // 获取用户信息
    const { data: userData } = await client
      .from("users")
      .select("id, username, role, name_color")
      .eq("id", user.id)
      .single();

    // 处理@提及通知
    if (mentions.length > 0) {
      const { data: mentionedUsers } = await client
        .from("users")
        .select("id, username")
        .in("username", [...new Set(mentions)]);

      if (mentionedUsers && mentionedUsers.length > 0) {
        // 创建通知
        const notifications = mentionedUsers
          .filter(u => u.id !== user.id) // 不通知自己
          .map(u => ({
            user_id: u.id,
            type: "benben_mention",
            title: `${user.username} 在犇犇中@了你`,
            content: body.content.substring(0, 100),
            related_id: benben.id,
            related_type: "benben",
          }));

        if (notifications.length > 0) {
          await client.from("notifications").insert(notifications);
        }
      }
    }

    return NextResponse.json({ 
      benben: {
        ...benben,
        author: userData
      }
    });
  } catch (error) {
    console.error("Create benben error:", error);
    return NextResponse.json({ error: "发布失败" }, { status: 500 });
  }
}
