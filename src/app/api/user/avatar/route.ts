import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { v4 as uuidv4 } from "uuid";

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

    // 将文件转换为 Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 生成文件名
    const fileExtension = file.type.split("/")[1];
    const fileName = `avatar-${user.id}-${uuidv4()}.${fileExtension}`;

    // 上传到对象存储
    // 这里使用 Supabase Storage，如果你使用其他对象存储服务，需要相应调整
    try {
      const { error: uploadError } = await getSupabaseClient()
        .storage
        .from("avatars")
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        // 如果 bucket 不存在，尝试创建
        if (uploadError.message.includes("Bucket not found")) {
          console.warn("Bucket 'avatars' not found, skipping storage upload");
          return NextResponse.json({ error: "存储服务未配置，请联系管理员" }, { status: 500 });
        }
        return NextResponse.json({ error: "上传失败" }, { status: 500 });
      }

      // 获取公共 URL
      const { data: publicUrlData } = getSupabaseClient()
        .storage
        .from("avatars")
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData.publicUrl;

      // 更新用户的头像URL
      const client = getSupabaseClient();
      const { error: updateError } = await client
        .from("users")
        .update({ avatar: avatarUrl })
        .eq("id", user.id);

      if (updateError) {
        console.error("Update avatar error:", updateError);
        return NextResponse.json({ error: "更新头像失败" }, { status: 500 });
      }

      // 更新cookie
      cookieStore.set(
        "user",
        JSON.stringify({
          ...user,
          avatar: avatarUrl,
        }),
        {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        }
      );

      return NextResponse.json({ success: true, avatarUrl });
    } catch (storageError) {
      console.error("Storage error:", storageError);
      return NextResponse.json({ error: "存储服务错误" }, { status: 500 });
    }
  } catch (error) {
    console.error("Upload avatar error:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
