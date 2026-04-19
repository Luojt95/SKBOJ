import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// 管理员调整用户积分（已禁用）
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: "积分系统已停用，请使用Rating系统" 
  }, { status: 403 });
}
