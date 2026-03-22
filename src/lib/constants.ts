// 洛谷风格难度配置（按用户要求）
export const difficultyConfig: Record<string, { color: string; bg: string; label: string; textColor: string }> = {
  entry: { 
    color: "text-red-600", 
    bg: "bg-red-500", 
    label: "入门",
    textColor: "text-red-600"
  },
  popular_minus: { 
    color: "text-orange-600", 
    bg: "bg-orange-500", 
    label: "普及-",
    textColor: "text-orange-500"
  },
  popular: { 
    color: "text-yellow-600", 
    bg: "bg-yellow-500", 
    label: "普及/提高-",
    textColor: "text-yellow-500"
  },
  popular_plus: { 
    color: "text-green-600", 
    bg: "bg-green-500", 
    label: "普及+/提高",
    textColor: "text-green-500"
  },
  improve_plus: { 
    color: "text-blue-600", 
    bg: "bg-blue-500", 
    label: "提高+/省选-",
    textColor: "text-blue-500"
  },
  provincial: { 
    color: "text-purple-600", 
    bg: "bg-purple-500", 
    label: "省选/NOI-",
    textColor: "text-purple-500"
  },
  noi: { 
    color: "text-gray-800", 
    bg: "bg-gray-800", 
    label: "NOI/NOI+/CTSC",
    textColor: "text-gray-800"
  },
  unknown: { 
    color: "text-gray-500", 
    bg: "bg-gray-400", 
    label: "未知",
    textColor: "text-gray-500"
  },
  // 兼容旧数据
  easy: { color: "text-red-600", bg: "bg-red-500", label: "入门", textColor: "text-red-600" },
  medium: { color: "text-yellow-600", bg: "bg-yellow-500", label: "普及/提高-", textColor: "text-yellow-500" },
  hard: { color: "text-gray-800", bg: "bg-gray-800", label: "NOI/NOI+/CTSC", textColor: "text-gray-800" },
};

// 用户名颜色配置（基于Rating）
export const nameColorConfig: Record<string, { color: string; label: string }> = {
  gray: { color: "text-gray-500", label: "未评级" },
  blue: { color: "text-blue-500", label: "蓝名" },
  green: { color: "text-green-500", label: "绿名" },
  orange: { color: "text-orange-500", label: "橙名" },
  red: { color: "text-red-500", label: "红名" },
  purple: { color: "text-purple-500", label: "紫名" },
  brown: { color: "text-amber-700", label: "棕名" },
};

// 题库分类配置
export const categoryConfig: Record<string, { label: string; color: string; description: string }> = {
  P: { label: "P题库", color: "text-blue-600", description: "普通题" },
  B: { label: "B题库", color: "text-green-600", description: "入门题" },
  F: { label: "F题库", color: "text-orange-600", description: "趣味题" },
  M: { label: "M题库", color: "text-purple-600", description: "模板题" },
};

// 根据Rating获取用户名颜色
export function getNameColorByRating(rating: number): string {
  if (rating >= 2600) return "purple";
  if (rating >= 2200) return "red";
  if (rating >= 1800) return "orange";
  if (rating >= 1400) return "green";
  if (rating >= 1000) return "blue";
  return "gray";
}

// 权限等级
export const roleLevel: Record<string, number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
};

// 检查权限是否足够
export function hasHigherOrEqualPermission(userRole: string, targetRole: string): boolean {
  return (roleLevel[userRole] || 0) >= (roleLevel[targetRole] || 0);
}
