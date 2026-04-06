import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取用户信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    const { data: user, error } = await client
      .from("users")
      .select(`
        id, username, role, points,
        solved_entry, solved_popular_minus, solved_popular,
        solved_popular_plus, solved_improve_plus, solved_provincial, solved_noi,
        created_at, bio
      `)
      .eq("id", parseInt(id))
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 转换为驼峰格式
    const formattedUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      points: user.points,
      solvedEntry: user.solved_entry,
      solvedPopularMinus: user.solved_popular_minus,
      solvedPopular: user.solved_popular,
      solvedPopularPlus: user.solved_popular_plus,
      solvedImprovePlus: user.solved_improve_plus,
      solvedProvincial: user.solved_provincial,
      solvedNoi: user.solved_noi,
      createdAt: user.created_at,
      bio: user.bio,
    };

    return NextResponse.json({ user: formattedUser });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 更新用户信息（站长可修改角色和颜色，管理员只能修改颜色）
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

    const currentUser = JSON.parse(userCookie.value);
    const body = await request.json();
    const client = getSupabaseClient();

    // 获取目标用户信息
    const { data: targetUser } = await client
      .from("users")
      .select("id, role")
      .eq("id", parseInt(id))
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 构建更新数据
    const updateData: Record<string, any> = {};

    // 站长可以修改角色
    if (body.role !== undefined && currentUser.role === "super_admin") {
      // 不能修改自己的角色
      if (currentUser.id === targetUser.id) {
        return NextResponse.json({ error: "不能修改自己的权限" }, { status: 403 });
      }
      // 只能设置为 user 或 admin
      if (["user", "admin"].includes(body.role)) {
        updateData.role = body.role;
        // 管理员自动设置为紫色
        updateData.name_color = body.role === "admin" ? "purple" : "gray";
      }
    }

    // 管理员和站长可以修改颜色
    if (body.name_color !== undefined && (currentUser.role === "admin" || currentUser.role === "super_admin")) {
      updateData.name_color = body.name_color;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "没有可更新的内容" }, { status: 400 });
    }

    const { data: user, error } = await client
      .from("users")
      .update(updateData)
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除用户（仅站长可用）
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

    const currentUser = JSON.parse(userCookie.value);

    // 只有站长可以注销用户
    if (currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    // 不能注销自己
    if (currentUser.id === parseInt(id)) {
      return NextResponse.json({ error: "不能注销自己" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 获取目标用户信息
    const { data: targetUser } = await client
      .from("users")
      .select("id, role")
      .eq("id", parseInt(id))
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 不能注销其他站长
    if (targetUser.role === "super_admin") {
      return NextResponse.json({ error: "不能注销其他站长" }, { status: 403 });
    }

    // 级联删除用户的所有相关数据
    const userId = parseInt(id);
    const deletePromises = [];

    // 删除用户的提交记录
    deletePromises.push(client.from("submissions").delete().eq("user_id", userId));
    // 删除用户的点赞
    deletePromises.push(client.from("likes").delete().eq("user_id", userId));
    // 删除用户的题解
    deletePromises.push(client.from("solutions").delete().eq("user_id", userId));
    // 删除用户的工单
    deletePromises.push(client.from("tickets").delete().eq("user_id", userId));
    // 删除用户的参赛记录
    deletePromises.push(client.from("contest_participants").delete().eq("user_id", userId));
    // 删除用户的积分历史
    deletePromises.push(client.from("points_history").delete().eq("user_id", userId));
    // 删除用户的关注关系
    deletePromises.push(client.from("user_follows").delete().eq("follower_id", userId));
    deletePromises.push(client.from("user_follows").delete().eq("following_id", userId));
    // 删除用户的通知
    deletePromises.push(client.from("notifications").delete().eq("user_id", userId));
    // 删除用户的私信
    deletePromises.push(client.from("private_messages").delete().eq("sender_id", userId));
    deletePromises.push(client.from("private_messages").delete().eq("receiver_id", userId));
    // 删除用户的benben
    deletePromises.push(client.from("benbens").delete().eq("author_id", userId));
    deletePromises.push(client.from("benbens").delete().eq("reply_to_user_id", userId));
    // 删除用户的身份信息
    deletePromises.push(client.from("identities").delete().eq("user_id", userId));
    // 删除用户的会话
    deletePromises.push(client.from("sessions").delete().eq("user_id", userId));
    // 删除用户的MFA因子
    deletePromises.push(client.from("mfa_factors").delete().eq("user_id", userId));
    // 删除用户的OAuth授权
    deletePromises.push(client.from("oauth_authorizations").delete().eq("user_id", userId));
    deletePromises.push(client.from("oauth_consents").delete().eq("user_id", userId));
    deletePromises.push(client.from("one_time_tokens").delete().eq("user_id", userId));

    // 执行所有删除操作（不等待，继续删除用户）
    const deleteResults = await Promise.allSettled(deletePromises);
    const errors = deleteResults.filter(r => r.status === "rejected");
    if (errors.length > 0) {
      console.error("Delete related data errors:", errors);
    }

    // 删除用户
    const { error } = await client
      .from("users")
      .delete()
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: "注销失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "注销失败" }, { status: 500 });
  }
}
