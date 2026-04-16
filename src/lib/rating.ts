// Rating 颜色配置
export const ratingConfig = {
  gray: { min: 0, max: 500, label: "灰名", color: "#808080", bgColor: "bg-gray-500" },
  green: { min: 501, max: 1000, label: "绿名", color: "#008000", bgColor: "bg-green-600" },
  blue: { min: 1001, max: 1500, label: "蓝名", color: "#0000FF", bgColor: "bg-blue-600" },
  orange: { min: 1501, max: 2000, label: "橙名", color: "#FFA500", bgColor: "bg-orange-500" },
  red: { min: 2001, max: Infinity, label: "红名", color: "#FF0000", bgColor: "bg-red-600" },
};

// Div 配置（数字越小等级越高）
export const divConfig = {
  "Div.1": { label: "Div.1", description: "最高等级，适合高手", countRating: true },
  "Div.2": { label: "Div.2", description: "中高等级", countRating: true },
  "Div.3": { label: "Div.3", description: "中等等级", countRating: true },
  "Div.4": { label: "Div.4", description: "入门等级，不计入Rating", countRating: false },
};

// 获取 Rating 颜色配置
export function getRatingConfig(rating: number) {
  if (rating <= 500) return ratingConfig.gray;
  if (rating <= 1000) return ratingConfig.green;
  if (rating <= 1500) return ratingConfig.blue;
  if (rating <= 2000) return ratingConfig.orange;
  return ratingConfig.red;
}

// 获取用户名的颜色（基于 Rating）
export function getUsernameColor(rating: number): string {
  return getRatingConfig(rating).color;
}

// 获取用户名的颜色类名
export function getUsernameColorClass(rating: number): string {
  return getRatingConfig(rating).bgColor;
}
