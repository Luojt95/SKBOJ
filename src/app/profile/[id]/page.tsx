"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trophy, Code, Target, Star, User, Calendar, Shield, AlertTriangle } from "lucide-react";

interface UserProfile {
  id: number;
  username: string;
  role: string;
  credit_rating: number;
  problem_rating: number;
  contest_rating: number;
  total_rating: number;
  name_color: string;
  solved_easy: number;
  solved_medium: number;
  solved_hard: number;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

// 洛谷风格难度标签
const difficultyLabels: Record<string, string> = {
  entry: "入门",
  popular: "普及",
  improve: "提高",
  provincial: "省选",
  noi: "NOI",
  noip: "NOI+",
  unknown: "未知",
};

// 颜色名称对应的颜色
const nameColorStyles: Record<string, { color: string; bg: string; label: string }> = {
  gray: { color: "text-gray-500", bg: "bg-gray-500", label: "灰名" },
  blue: { color: "text-blue-500", bg: "bg-blue-500", label: "蓝名" },
  green: { color: "text-green-500", bg: "bg-green-500", label: "绿名" },
  orange: { color: "text-orange-500", bg: "bg-orange-500", label: "橙名" },
  red: { color: "text-red-500", bg: "bg-red-500", label: "红名" },
  purple: { color: "text-purple-500", bg: "bg-purple-500", label: "紫名(管理员)" },
  brown: { color: "text-amber-700", bg: "bg-amber-700", label: "棕名(警告)" },
};

// 根据总Rating计算颜色
function calculateColorByRating(rating: number, role: string): string {
  if (role === "admin" || role === "super_admin") return "purple";
  if (rating <= 50) return "gray";
  if (rating <= 120) return "blue";
  if (rating <= 160) return "green";
  if (rating <= 200) return "orange";
  return "red";
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = params.id;
        
        console.log("Fetching profile for user:", userId);
        
        const [profileRes, userRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch("/api/auth/me"),
        ]);

        console.log("Profile response status:", profileRes.status);
        
        if (profileRes.ok) {
          const data = await profileRes.json();
          console.log("Profile data:", data);
          setProfile(data.user);
        } else {
          const errorData = await profileRes.json();
          console.error("Profile fetch error:", errorData);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const canChangeColor = currentUser && 
    (currentUser.role === "admin" || currentUser.role === "super_admin") &&
    profile && currentUser.id !== profile.id;

  const handleChangeNameColor = async (color: string) => {
    if (!profile) return;

    try {
      const res = await fetch(`/api/users/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_color: color }),
      });

      if (res.ok) {
        toast.success("颜色已更新");
        setProfile({ ...profile, name_color: color });
      } else {
        toast.error("更新失败");
      }
    } catch {
      toast.error("更新失败");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>用户不存在</p>
        <Button className="mt-4" onClick={() => router.push("/users")}>
          返回用户列表
        </Button>
      </div>
    );
  }

  const colorStyle = nameColorStyles[profile.name_color] || nameColorStyles.gray;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 用户信息卡片 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className={`text-3xl ${colorStyle.bg} text-white`}>
                {profile.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className={`text-3xl font-bold ${colorStyle.color}`}>
                  {profile.username}
                </h1>
                <Badge className={`${colorStyle.bg} text-white`}>
                  {colorStyle.label}
                </Badge>
                {profile.role === "admin" && (
                  <Badge className="bg-orange-500 text-white">管理员</Badge>
                )}
                {profile.role === "super_admin" && (
                  <Badge className="bg-red-500 text-white">站长</Badge>
                )}
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  加入于 {formatDate(profile.created_at)}
                </span>
              </div>
            </div>
            {canChangeColor && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm text-muted-foreground">设置用户颜色</span>
                <Select value={profile.name_color} onValueChange={handleChangeNameColor}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gray">灰名</SelectItem>
                    <SelectItem value="blue">蓝名</SelectItem>
                    <SelectItem value="green">绿名</SelectItem>
                    <SelectItem value="orange">橙名</SelectItem>
                    <SelectItem value="red">红名</SelectItem>
                    <SelectItem value="purple">紫名(管理员)</SelectItem>
                    <SelectItem value="brown">棕名(警告)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rating 信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              总 Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${colorStyle.color}`}>
              {profile.total_rating}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              个人信用
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.credit_rating}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Code className="h-4 w-4" />
              做题得分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.problem_rating}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              比赛得分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.contest_rating}</div>
          </CardContent>
        </Card>
      </div>

      {/* 通过题目统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              通过题目统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">入门题</span>
                <span className="font-bold text-green-500">{profile.solved_easy} 题</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">普及题</span>
                <span className="font-bold text-yellow-500">{profile.solved_medium} 题</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">提高题</span>
                <span className="font-bold text-red-500">{profile.solved_hard} 题</span>
              </div>
              <div className="border-t pt-4 flex items-center justify-between">
                <span className="font-medium">总计</span>
                <span className="font-bold text-lg">
                  {profile.solved_easy + profile.solved_medium + profile.solved_hard} 题
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Rating 规则说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span>灰名: 0-50 分</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>蓝名: 51-120 分</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>绿名: 121-160 分</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>橙名: 161-200 分</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>红名: 201+ 分</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>紫名: 管理员专属</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-700" />
                <span>棕名: 被管理员警告</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs">
                Rating = 个人信用(初始100) + 做题得分 + 比赛得分
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
