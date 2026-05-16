import { getSupabaseClient } from "../storage/database/supabase-client";
import bcrypt from "bcryptjs";

/**
 * 自动初始化站长账号
 * 如果数据库中没有 super_admin 用户，则自动创建
 */
export async function ensureSuperAdmin() {
  try {
    const client = getSupabaseClient();

    // 检查是否已存在 super_admin
    const { data: existingAdmin, error: checkError } = await client
      .from("users")
      .select("id, username")
      .eq("role", "super_admin")
      .limit(1);

    if (checkError) {
      console.error("[init] 检查管理员账号失败:", checkError.message);
      return;
    }

    if (existingAdmin && existingAdmin.length > 0) {
      return; // 静默返回，不打印日志
    }

    // 创建站长账号
    const username = "Luojt95";
    const password = "cout142857c++";
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const { error: insertError } = await client
      .from("users")
      .insert({
        username,
        password: hashedPassword,
        role: "super_admin",
        name_color: "purple",
        rating: 0,
        solved_entry: 0,
        solved_popular_minus: 0,
        solved_popular: 0,
        solved_popular_plus: 0,
        solved_improve_plus: 0,
        solved_provincial: 0,
        solved_noi: 0,
        last_login: now,
      });

    if (insertError) {
      console.error("[init] 创建站长账号失败:", insertError.message);
      return;
    }

    console.log("[init] 站长账号自动创建成功:", username);
  } catch (err) {
    console.error("[init] 初始化站长账号异常:", err);
  }
}
