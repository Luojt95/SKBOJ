import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取每日限制
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();

    // 站长没有限制
    if (user.role === "super_admin") {
      return NextResponse.json({
        unlimited: true,
        limits: null
      });
    }

    // 获取今天的限制
    const today = new Date().toISOString().split('T')[0];
    const { data: limits, error } = await client
      .from("daily_limits")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Get daily limits error:", error);
      return NextResponse.json({ error: "获取限制失败" }, { status: 500 });
    }

    // 默认限制
    const defaultLimits = {
      problems_created: 3,
      benbens_created: 3,
      messages_created: 5,
      contests_created: 1,
      discussions_created: 1,
      shares_created: 2,
      tickets_created: 1,
      replies_count: 5
    };

    return NextResponse.json({
      unlimited: false,
      limits: limits || { ...defaultLimits, user_id: user.id, date: today },
      maxLimits: defaultLimits
    });
  } catch (error) {
    console.error("Get daily limits error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 更新每日限制
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const body = await request.json();
    const { type } = body;

    if (!type) {
      return NextResponse.json({ error: "缺少类型参数" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 站长没有限制
    if (user.role === "super_admin") {
      return NextResponse.json({ success: true });
    }

    // 检查是否已打卡
    const { data: userCheckIn } = await client
      .from("users")
      .select("last_check_in")
      .eq("id", user.id)
      .single();

    const today = new Date().toISOString().split('T')[0];
    const lastCheckIn = userCheckIn?.last_check_in ? userCheckIn.last_check_in.split('T')[0] : null;

    if (!lastCheckIn || lastCheckIn !== today) {
      return NextResponse.json({ error: "请先打卡" }, { status: 400 });
    }

    // 字段映射
    const fieldMap: Record<string, string> = {
      problem: "problems_created",
      benben: "benbens_created",
      message: "messages_created",
      contest: "contests_created",
      discussion: "discussions_created",
      share: "shares_created",
      ticket: "tickets_created",
      reply: "replies_count"
    };

    const field = fieldMap[type];
    if (!field) {
      return NextResponse.json({ error: "无效的类型" }, { status: 400 });
    }

    // 获取当前限制
    let limits;
    const { data: existingLimits } = await client
      .from("daily_limits")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (existingLimits) {
      limits = existingLimits;
    } else {
      // 创建新记录
      const { data: newLimits } = await client
        .from("daily_limits")
        .insert({
          user_id: user.id,
          date: today
        })
        .select()
        .single();
      limits = newLimits;
    }

    // 检查是否还有次数
    const maxLimits: Record<string, number> = {
      problems_created: 3,
      benbens_created: 3,
      messages_created: 5,
      contests_created: 1,
      discussions_created: 1,
      shares_created: 2,
      tickets_created: 1,
      replies_count: 5
    };

    const currentCount = (limits as any)[field] || 0;
    const maxCount = maxLimits[field];

    if (currentCount >= maxCount) {
      return NextResponse.json({ error: "今日次数已用完" }, { status: 400 });
    }

    // 增加次数
    const { data: updatedLimits, error } = await client
      .from("daily_limits")
      .update({ [field]: currentCount + 1 })
      .eq("id", limits.id)
      .select()
      .single();

    if (error) {
      console.error("Update daily limits error:", error);
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true, limits: updatedLimits });
  } catch (error) {
    console.error("Update daily limits error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
