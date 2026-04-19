import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 检查今日是否已签到
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();
    
    const today = new Date().toISOString().split("T")[0];
    
    // 检查今天是否已签到
    const { data: checkIn } = await client
      .from("check_ins")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`)
      .single();

    return NextResponse.json({ checkedIn: !!checkIn });
  } catch (error) {
    console.error("Check check-in status error:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

// 执行签到
export async function POST() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const client = getSupabaseClient();
    
    const today = new Date().toISOString().split("T")[0];
    
    // 检查今天是否已签到
    const { data: existingCheckIn } = await client
      .from("check_ins")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`)
      .single();

    if (existingCheckIn) {
      return NextResponse.json({ 
        success: false, 
        message: "今日已签到" 
      }, { status: 400 });
    }

    // 创建签到记录
    const { error } = await client
      .from("check_ins")
      .insert({ user_id: user.id });

    if (error) {
      console.error("Check-in insert error:", error);
      return NextResponse.json({ success: false, message: "签到失败" }, { status: 500 });
    }

    // 更新用户的最后签到时间（用于解锁每日限额）
    const { error: updateError } = await client
      .from("users")
      .update({ last_check_in: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      console.error("Update user last_check_in error:", updateError);
    }

    // 更新或创建今日的daily_limits记录
    const todayDate = new Date().toISOString().split('T')[0];
    const { data: existingLimits } = await client
      .from("daily_limits")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", todayDate)
      .single();

    if (existingLimits) {
      // 更新已存在的记录
      await client
        .from("daily_limits")
        .update({ checked_in: true })
        .eq("user_id", user.id)
        .eq("date", todayDate);
    } else {
      // 创建新记录
      await client
        .from("daily_limits")
        .insert({
          user_id: user.id,
          date: todayDate,
          checked_in: true,
          problems_created: 0,
          benbens_created: 0,
          messages_created: 0,
          contests_created: 0,
          discussions_created: 0,
          shares_created: 0,
          tickets_created: 0,
          replies_count: 0
        });
    }

    return NextResponse.json({ 
      success: true, 
      message: "签到成功" 
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: "签到失败" }, { status: 500 });
  }
}
