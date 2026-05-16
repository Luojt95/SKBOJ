import { NextResponse } from "next/server";
import { ensureSuperAdmin } from "@/lib/init-admin";

export async function GET() {
  try {
    await ensureSuperAdmin();
    return NextResponse.json({ success: true, message: "初始化完成" });
  } catch {
    return NextResponse.json({ success: false, message: "初始化失败" }, { status: 500 });
  }
}
