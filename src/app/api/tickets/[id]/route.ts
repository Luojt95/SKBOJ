import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

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

    const user = JSON.parse(userCookie.value);

    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "没有权限" }, { status: 403 });
    }

    const body = await request.json();
    const client = getSupabaseClient();

    const { data: ticket, error } = await client
      .from("tickets")
      .update({
        status: body.status,
        reply: body.reply || null,
        handler_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) {
      console.error("Update ticket error:", error);
      return NextResponse.json({ error: "处理失败" }, { status: 500 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Update ticket error:", error);
    return NextResponse.json({ error: "处理失败" }, { status: 500 });
  }
}
