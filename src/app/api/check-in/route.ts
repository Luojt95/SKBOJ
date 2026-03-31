import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkIn, hasCheckedInToday } from "@/lib/points-system";

// 检查今日是否已签到
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const checkedIn = await hasCheckedInToday(user.id);

    return NextResponse.json({ checkedIn });
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
    const result = await checkIn(user.id);

    if (result.success) {
      // 更新 cookie 中的积分
      const cookieStore = await cookies();
      cookieStore.set(
        "user",
        JSON.stringify({
          ...user,
          points: result.points,
        }),
        {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        }
      );

      return NextResponse.json({ 
        success: true, 
        message: result.message,
        points: result.points 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: result.message 
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: "签到失败" }, { status: 500 });
  }
}
