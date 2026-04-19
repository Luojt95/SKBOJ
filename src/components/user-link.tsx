"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { getUserNameColorByRatingAndRole } from "@/lib/rating";

interface UserLinkProps {
  id: number;
  username: string;
  rating?: number | null;
  role?: string;
  className?: string;
}

export default function UserLink({ 
  id, 
  username, 
  rating,
  role,
  className,
}: UserLinkProps) {
  const colorClass = getUserNameColorByRatingAndRole(rating ?? 0, role);

  return (
    <Link 
      href={`/profile/${id}`}
      className={cn(
        "font-medium hover:underline transition-colors",
        colorClass,
        className
      )}
    >
      {username}
    </Link>
  );
}
