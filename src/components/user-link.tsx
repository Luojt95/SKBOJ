"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface UserLinkProps {
  id: number;
  username: string;
  points?: number | null;
  role?: string;
  className?: string;
  showPoints?: boolean;
}

// 根据积分获取颜色
function getPointsColor(points: number | null | undefined, role?: string): string {
  // 站长和管理员紫色
  if (role === "super_admin" || role === "admin") {
    return "text-purple-500";
  }

  const p = points || 0;
  
  if (p <= 0) return "text-gray-500";        // 0积分：灰色
  if (p <= 10) return "text-sky-400";        // 1-10：浅蓝色
  if (p <= 20) return "text-blue-600";       // 11-20：深蓝色
  if (p <= 50) return "text-green-500";      // 21-50：绿色
  if (p <= 100) return "text-yellow-500";    // 51-100：黄色
  if (p <= 200) return "text-orange-500";    // 101-200：橙色
  if (p <= 500) return "text-red-500";       // 201-500：红色
  return "text-amber-400";                    // 500+：亮金色
}

// 获取等级名称
function getPointsTitle(points: number | null | undefined, role?: string): string {
  if (role === "super_admin") return "站长";
  if (role === "admin") return "管理员";
  
  const p = points || 0;
  
  if (p <= 0) return "新手";
  if (p <= 10) return "入门";
  if (p <= 20) return "初级";
  if (p <= 50) return "中级";
  if (p <= 100) return "高级";
  if (p <= 200) return "专家";
  if (p <= 500) return "大师";
  return "传奇";
}

export default function UserLink({ 
  id, 
  username, 
  points, 
  role,
  className,
  showPoints = false 
}: UserLinkProps) {
  const colorClass = getPointsColor(points, role);
  const title = `${username} (${getPointsTitle(points, role)})`;

  return (
    <Link 
      href={`/profile/${id}`}
      className={cn(
        "font-medium hover:underline transition-colors",
        colorClass,
        className
      )}
      title={title}
    >
      {username}
      {showPoints && points !== null && points !== undefined && (
        <span className="ml-1 text-xs opacity-70">({points})</span>
      )}
    </Link>
  );
}
