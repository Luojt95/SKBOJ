import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkIn, hasCheckedInToday, getPointsHistory } from "@/lib/points-system";

// 签到
export async function POST() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const result = await checkIn(user.id);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error("Check in error:", error);
    return NextResponse.json({ error: "签到失败" }, { status: 500 });
  }
}

// 获取签到状态和积分历史
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const hasCheckedIn = await hasCheckedInToday(user.id);
    const history = await getPointsHistory(user.id, 20);

    return NextResponse.json({
      hasCheckedInToday: hasCheckedIn,
      history,
    });
  } catch (error) {
    console.error("Get check-in status error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
