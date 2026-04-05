import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取关注列表/粉丝列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const type = searchParams.get("type"); // "followers" 或 "following"
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
    }

    const client = getSupabaseClient();

    if (type === "followers") {
      // 获取粉丝列表（谁关注了我）
      const { data: follows, error, count } = await client
        .from("user_follows")
        .select("*", { count: "exact" })
        .eq("following_id", parseInt(userId))
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Get followers error:", error);
        return NextResponse.json({ error: "获取粉丝失败" }, { status: 500 });
      }

      // 获取粉丝用户信息
      let followersWithUsers = [];
      if (follows && follows.length > 0) {
        const followerIds = follows.map(f => f.follower_id);
        const { data: users } = await client
          .from("users")
          .select("id, username, role, name_color, points")
          .in("id", followerIds);

        const usersMap = new Map((users || []).map(u => [u.id, u]));

        followersWithUsers = follows.map(f => ({
          ...f,
          user: usersMap.get(f.follower_id)
        }));
      }

      return NextResponse.json({ 
        followers: followersWithUsers,
        total: count || 0
      });
    } else {
      // 获取关注列表（我关注了谁）
      const { data: follows, error, count } = await client
        .from("user_follows")
        .select("*", { count: "exact" })
        .eq("follower_id", parseInt(userId))
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Get following error:", error);
        return NextResponse.json({ error: "获取关注失败" }, { status: 500 });
      }

      // 获取关注用户信息
      let followingWithUsers = [];
      if (follows && follows.length > 0) {
        const followingIds = follows.map(f => f.following_id);
        const { data: users } = await client
          .from("users")
          .select("id, username, role, name_color, points")
          .in("id", followingIds);

        const usersMap = new Map((users || []).map(u => [u.id, u]));

        followingWithUsers = follows.map(f => ({
          ...f,
          user: usersMap.get(f.following_id)
        }));
      }

      return NextResponse.json({ 
        following: followingWithUsers,
        total: count || 0
      });
    }
  } catch (error) {
    console.error("Get follows error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 关注/取消关注
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    const { targetUserId, action } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "缺少目标用户ID" }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "不能关注自己" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 检查目标用户是否存在
    const { data: targetUser } = await client
      .from("users")
      .select("id, username")
      .eq("id", targetUserId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    if (action === "follow") {
      // 检查是否已关注
      const { data: existing } = await client
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .single();

      if (existing) {
        return NextResponse.json({ error: "已关注该用户" }, { status: 400 });
      }

      // 创建关注关系
      const { error: followError } = await client
        .from("user_follows")
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
        });

      if (followError) {
        console.error("Follow error:", followError);
        return NextResponse.json({ error: "关注失败" }, { status: 500 });
      }

      // 创建通知
      const { data: currentUser } = await client
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();

      await client.from("notifications").insert({
        user_id: targetUserId,
        type: "follow",
        title: `${currentUser?.username || "有人"} 关注了你`,
        related_id: user.id,
        related_type: "user",
      });

      return NextResponse.json({ success: true, isFollowing: true });
    } else if (action === "unfollow") {
      // 取消关注
      const { error: unfollowError } = await client
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (unfollowError) {
        console.error("Unfollow error:", unfollowError);
        return NextResponse.json({ error: "取消关注失败" }, { status: 500 });
      }

      return NextResponse.json({ success: true, isFollowing: false });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}

// 检查是否关注
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ isFollowing: false });
    }

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "缺少目标用户ID" }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { data: follow } = await client
      .from("user_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .single();

    return NextResponse.json({ isFollowing: !!follow });
  } catch (error) {
    console.error("Check follow error:", error);
    return NextResponse.json({ isFollowing: false });
  }
}
