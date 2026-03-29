"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface UserLinkProps {
  id: number;
  username: string;
  rating?: number | null;
  warningLevel?: string | null;
  className?: string;
  showRating?: boolean;
}

// Rating颜色配置
function getRatingColor(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return "text-foreground";
  
  if (rating < 1000) return "text-gray-500";
  if (rating < 1200) return "text-green-500";
  if (rating < 1400) return "text-blue-500";
  if (rating < 1600) return "text-cyan-500";
  if (rating < 1800) return "text-purple-500";
  if (rating < 2000) return "text-yellow-500";
  if (rating < 2200) return "text-orange-500";
  if (rating < 2400) return "text-red-500";
  if (rating < 2600) return "text-pink-500";
  return "text-rose-400"; // 2600+
}

// Rating等级名称
function getRatingTitle(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return "未评级";
  
  if (rating < 1000) return "Newbie";
  if (rating < 1200) return "Pupil";
  if (rating < 1400) return "Specialist";
  if (rating < 1600) return "Expert";
  if (rating < 1800) return "Candidate Master";
  if (rating < 2000) return "Master";
  if (rating < 2200) return "International Master";
  if (rating < 2400) return "Grandmaster";
  if (rating < 2600) return "International Grandmaster";
  return "Legendary Grandmaster";
}

export default function UserLink({ 
  id, 
  username, 
  rating, 
  warningLevel,
  className,
  showRating = false 
}: UserLinkProps) {
  // 如果用户有提醒，名字显示为灰色
  const hasWarning = warningLevel && warningLevel !== "";
  const colorClass = hasWarning 
    ? "text-gray-400 line-through" 
    : getRatingColor(rating);
  
  const title = hasWarning 
    ? `该用户已被${warningLevel}级提醒` 
    : `${username} (${getRatingTitle(rating)})`;

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
      {showRating && rating !== null && rating !== undefined && !hasWarning && (
        <span className="ml-1 text-xs opacity-70">({rating})</span>
      )}
    </Link>
  );
}
