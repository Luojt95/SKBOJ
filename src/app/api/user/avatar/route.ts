import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 上传头像
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (!userCookie) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "请选择头像文件" }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "只支持 JPG、PNG、GIF、WebP 格式的图片" }, { status: 400 });
    }

    // 验证文件大小 (最大 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "图片大小不能超过 2MB" }, { status: 400 });
    }

    // 直接使用 Base64 存储，简单可靠
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = `data:${file.type};base64,${buffer.toString("base64")}`;

    // 更新用户的头像URL
    const client = getSupabaseClient();
    const { error: updateError } = await client
      .from("users")
      .update({ avatar: base64Data })
      .eq("id", user.id);

    if (updateError) {
      console.error("Update avatar error:", updateError);
      return NextResponse.json({ error: "更新头像失败" }, { status: 500 });
    }

    // 构建响应并设置 cookie
    const updatedUser = { ...user, avatar: base64Data };
    const response = NextResponse.json({ success: true, avatarUrl: base64Data });
    response.cookies.set("user", JSON.stringify(updatedUser), {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Upload avatar error:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
