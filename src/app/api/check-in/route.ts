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

    return NextResponse.json({ 
      success: true, 
      message: "签到成功" 
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: "签到失败" }, { status: 500 });
  }
}
