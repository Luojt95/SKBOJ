"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  User, MessageCircle, Activity, Users, Heart, 
  Code, Trophy, FileText, MessageSquare, Share2, Ticket,
  Calendar, Award, TrendingUp, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: number;
  username: string;
  role: string;
  name_color?: string;
  creditRating: number;
  problemRating: number;
  contestRating: number;
  totalRating: number;
  solvedEntry: number;
  solvedPopularMinus: number;
  solvedPopular: number;
  solvedPopularPlus: number;
  solvedImprovePlus: number;
  solvedProvincial: number;
  solvedNoi: number;
  createdAt: string;
  warning_level?: string;
  warning_reason?: string;
  warning_at?: string;
}

interface Benben {
  id: number;
  content: string;
  author_id: number;
  likes: number;
  reply_count: number;
  created_at: string;
  author?: {
    id: number;
    username: string;
    role: string;
    name_color?: string;
  };
}

interface Activity {
  type: string;
  id: number;
  title: string;
  created_at: string;
  status?: string;
}

interface FollowUser {
  id: number;
  follower_id?: number;
  following_id?: number;
  user: {
    id: number;
    username: string;
    role: string;
    name_color?: string;
    total_rating?: number;
  };
  created_at: string;
}

// 颜色样式映射
const nameColorStyles: Record<string, string> = {
  gray: "text-gray-500",
  blue: "text-blue-500",
  green: "text-green-500",
  orange: "text-orange-500",
  red: "text-red-500",
  purple: "text-purple-500",
  brown: "text-amber-700",
};

const nameBgStyles: Record<string, string> = {
  gray: "bg-gray-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
  brown: "bg-amber-700",
};

// 难度标签配置
const difficultyConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  entry: { label: "入门", color: "text-red-600", bgColor: "bg-red-100" },
  popular_minus: { label: "普及-", color: "text-orange-600", bgColor: "bg-orange-100" },
  popular: { label: "普及/提高-", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  popular_plus: { label: "普及+/提高", color: "text-green-600", bgColor: "bg-green-100" },
  improve_plus: { label: "提高+/省选-", color: "text-blue-600", bgColor: "bg-blue-100" },
  provincial: { label: "省选/NOI-", color: "text-purple-600", bgColor: "bg-purple-100" },
  noi: { label: "NOI/NOI+/CTSC", color: "text-gray-800", bgColor: "bg-gray-200" },
};

// 提醒级别配置
const warningLevelConfig: Record<string, { label: string; ratingPenalty: number; restrictions: string[]; color: string }> = {
  C: { label: "C级提醒", ratingPenalty: 10, restrictions: [], color: "bg-gray-500" },
  B: { label: "B级提醒", ratingPenalty: 30, restrictions: [], color: "bg-blue-500" },
  A: { label: "A级提醒", ratingPenalty: 50, restrictions: ["题解", "讨论"], color: "bg-orange-500" },
  S: { label: "S级提醒", ratingPenalty: 100, restrictions: ["题解", "讨论", "犇犇", "私信", "分享"], color: "bg-red-500" },
};

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: number; role: string } | null>(null);
  const [benbens, setBenbens] = useState<Benben[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningLevel, setWarningLevel] = useState<string>("C");
  const [warningReason, setWarningReason] = useState("");
  const [warningLoading, setWarningLoading] = useState(false);
  const pathname = usePathname();

  // Tab状态
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    // 获取当前用户
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        }
      } catch {}
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // 获取用户信息
        const res = await fetch(`/api/users/${resolvedParams.id}`);
        if (!res.ok) throw new Error("用户不存在");
        const data = await res.json();
        setUser(data.user);

        // 获取关注信息
        if (currentUser && currentUser.id !== parseInt(resolvedParams.id)) {
          const followRes = await fetch("/api/follows", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: parseInt(resolvedParams.id) }),
          });
          const followData = await followRes.json();
          setIsFollowing(followData.isFollowing);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error("加载用户信息失败");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [resolvedParams.id, currentUser]);

  const fetchFollowers = async () => {
    try {
      const res = await fetch(`/api/follows?userId=${resolvedParams.id}&type=followers`);
      const data = await res.json();
      setFollowers(data.followers || []);
      setFollowersCount(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch followers:", error);
    }
  };

  const fetchFollowing = async () => {
    try {
      const res = await fetch(`/api/follows?userId=${resolvedParams.id}&type=following`);
      const data = await res.json();
      setFollowing(data.following || []);
      setFollowingCount(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch following:", error);
    }
  };

  const fetchBenbens = async () => {
    try {
      const res = await fetch(`/api/benbens?userId=${resolvedParams.id}`);
      const data = await res.json();
      setBenbens(data.benbens || []);
    } catch (error) {
      console.error("Failed to fetch benbens:", error);
    }
  };

  const fetchActivities = async () => {
    try {
      // 使用现有的API获取用户活动
      // 由于现有API不支持按作者筛选，这里先简化处理
      setActivities([]);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    }
  };

  // Tab切换时加载数据
  useEffect(() => {
    if (activeTab === "benbens" && benbens.length === 0) {
      fetchBenbens();
    } else if (activeTab === "activities" && activities.length === 0) {
      fetchActivities();
    } else if (activeTab === "followers") {
      fetchFollowers();
    } else if (activeTab === "following") {
      fetchFollowing();
    }
  }, [activeTab]);

  // 初始加载关注数
  useEffect(() => {
    fetchFollowers();
    fetchFollowing();
  }, []);

  const handleFollow = async () => {
    if (!currentUser) {
      toast.error("请先登录");
      return;
    }

    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: parseInt(resolvedParams.id),
          action: isFollowing ? "unfollow" : "follow",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setIsFollowing(!isFollowing);
      if (isFollowing) {
        setFollowersCount(prev => prev - 1);
      } else {
        setFollowersCount(prev => prev + 1);
      }
      toast.success(isFollowing ? "已取消关注" : "关注成功");
    } catch (error: any) {
      toast.error(error.message || "操作失败");
    }
  };

  const handleWarning = async () => {
    if (!warningReason.trim()) {
      toast.error("请填写提醒原因");
      return;
    }

    setWarningLoading(true);
    try {
      const res = await fetch(`/api/users/${resolvedParams.id}/warning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: warningLevel,
          reason: warningReason.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        setShowWarningDialog(false);
        setWarningReason("");
        // 刷新用户信息
        const userRes = await fetch(`/api/users/${resolvedParams.id}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
        }
      } else {
        toast.error(data.error || "提醒失败");
      }
    } catch {
      toast.error("提醒失败");
    } finally {
      setWarningLoading(false);
    }
  };

  const handleCancelWarning = async () => {
    if (!confirm("确定要取消对该用户的提醒吗？")) return;

    setWarningLoading(true);
    try {
      const res = await fetch(`/api/users/${resolvedParams.id}/warning`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        // 刷新用户信息
        const userRes = await fetch(`/api/users/${resolvedParams.id}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
        }
      } else {
        toast.error(data.error || "取消提醒失败");
      }
    } catch {
      toast.error("取消提醒失败");
    } finally {
      setWarningLoading(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "未知";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "未知";
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityLink = (activity: Activity) => {
    switch (activity.type) {
      case "problem":
        return `/problems/${activity.id}`;
      case "contest":
        return `/contests/${activity.id}`;
      case "solution":
        return `/problems/${activity.id}/solutions`;
      case "discussion":
        return `/discussions/${activity.id}`;
      case "share":
        return `/shares`;
      case "ticket":
        return `/tickets`;
      default:
        return "#";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "problem":
        return <Code className="h-4 w-4" />;
      case "contest":
        return <Trophy className="h-4 w-4" />;
      case "solution":
        return <FileText className="h-4 w-4" />;
      case "discussion":
        return <MessageSquare className="h-4 w-4" />;
      case "share":
        return <Share2 className="h-4 w-4" />;
      case "ticket":
        return <Ticket className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case "problem":
        return "创建题目";
      case "contest":
        return "创建比赛";
      case "solution":
        return "发布题解";
      case "discussion":
        return "发起讨论";
      case "share":
        return "分享代码";
      case "ticket":
        return "提交工单";
      default:
        return "动态";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">用户不存在</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userColorStyle = user.name_color ? nameColorStyles[user.name_color] || "" : "";
  const userBgStyle = user.name_color ? nameBgStyles[user.name_color] || "bg-gradient-to-br from-blue-500 to-purple-600" : "bg-gradient-to-br from-blue-500 to-purple-600";
  const isOwnProfile = currentUser?.id === user.id;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* 用户信息卡片 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className={`${userBgStyle} text-white text-3xl`}>
                {user.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className={`text-2xl font-bold ${userColorStyle}`}>{user.username}</h1>
                {user.role === "super_admin" && <Badge variant="destructive">站长</Badge>}
                {user.role === "admin" && <Badge className="bg-orange-500">管理员</Badge>}
                {user.warning_level && (
                  <Badge className={`${warningLevelConfig[user.warning_level]?.color || "bg-gray-500"} text-white`}>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {warningLevelConfig[user.warning_level]?.label || "已提醒"}
                  </Badge>
                )}
              </div>
              {/* 显示提醒原因 */}
              {user.warning_level && user.warning_reason && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>提醒原因：</strong>{user.warning_reason}
                  </p>
                  {user.warning_at && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      提醒时间：{formatDateTime(user.warning_at)}
                    </p>
                  )}
                  {warningLevelConfig[user.warning_level]?.restrictions.length > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      限制：不可发布 {warningLevelConfig[user.warning_level].restrictions.join("、")}
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>注册于 {formatDate(user.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  <span>Rating: {user.totalRating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>信用: {user.creditRating}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <Link href={`#${activeTab}`} onClick={() => setActiveTab("followers")} className="hover:underline">
                  <span className="font-semibold">{followersCount}</span>
                  <span className="text-muted-foreground ml-1">粉丝</span>
                </Link>
                <Link href={`#${activeTab}`} onClick={() => setActiveTab("following")} className="hover:underline">
                  <span className="font-semibold">{followingCount}</span>
                  <span className="text-muted-foreground ml-1">关注</span>
                </Link>
              </div>
            </div>
            {!isOwnProfile && currentUser && (
              <div className="flex gap-2">
                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? "outline" : "default"}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFollowing ? "fill-current text-red-500" : ""}`} />
                  {isFollowing ? "已关注" : "关注"}
                </Button>
              </div>
            )}
            {/* 站长提醒功能 */}
            {currentUser?.role === "super_admin" && !isOwnProfile && user.role !== "super_admin" && (
              <div className="flex gap-2">
                {user.warning_level ? (
                  <Button
                    variant="outline"
                    className="text-green-600 hover:text-green-700"
                    onClick={handleCancelWarning}
                    disabled={warningLoading}
                  >
                    取消提醒
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="text-orange-600 hover:text-orange-700"
                    onClick={() => setShowWarningDialog(true)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    提醒用户
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 难度统计 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">刷题统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(difficultyConfig).map(([key, config]) => {
              const count = user[`solved${key.charAt(0).toUpperCase() + key.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}` as keyof UserProfile] as number;
              return (
                <Badge key={key} className={`${config.bgColor} ${config.color} hover:${config.bgColor}`}>
                  {config.label}: {count || 0}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tab导航 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="home" className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">首页</span>
          </TabsTrigger>
          <TabsTrigger value="benbens" className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">犇犇</span>
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">动态</span>
          </TabsTrigger>
          <TabsTrigger value="followers" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">粉丝</span>
          </TabsTrigger>
          <TabsTrigger value="following" className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">关注</span>
          </TabsTrigger>
        </TabsList>

        {/* 首页 - 简介 */}
        <TabsContent value="home">
          <Card>
            <CardHeader>
              <CardTitle>个人简介</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                这位用户还没有填写个人简介。
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 犇犇 */}
        <TabsContent value="benbens">
          <div className="space-y-4">
            {benbens.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  暂无犇犇
                </CardContent>
              </Card>
            ) : (
              benbens.map((benben) => (
                <Card key={benben.id}>
                  <CardContent className="pt-4">
                    <p className="whitespace-pre-wrap mb-3">{benben.content}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatDateTime(benben.created_at)}</span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {benben.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        {benben.reply_count}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* 动态 */}
        <TabsContent value="activities">
          <div className="space-y-3">
            {activities.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  暂无动态
                </CardContent>
              </Card>
            ) : (
              activities.map((activity) => (
                <Link key={`${activity.type}-${activity.id}`} href={getActivityLink(activity)}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="py-3 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{getActivityLabel(activity.type)}</span>
                          {activity.status && (
                            <Badge variant={activity.status === "accepted" ? "default" : "secondary"} className="text-xs">
                              {activity.status === "accepted" ? "已受理" : activity.status === "rejected" ? "已拒绝" : "待处理"}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium truncate">{activity.title}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(activity.created_at)}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>

        {/* 粉丝 */}
        <TabsContent value="followers">
          <div className="grid gap-3 md:grid-cols-2">
            {followers.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="py-8 text-center text-muted-foreground">
                  暂无粉丝
                </CardContent>
              </Card>
            ) : (
              followers.map((follow) => (
                <Link key={follow.id} href={`/profile/${follow.user.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="py-3 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={follow.user.name_color ? nameBgStyles[follow.user.name_color] : "bg-gradient-to-br from-blue-500 to-purple-600"}>
                          {follow.user.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className={`font-medium ${follow.user.name_color ? nameColorStyles[follow.user.name_color] : ""}`}>
                          {follow.user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          关注于 {formatDate(follow.created_at)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>

        {/* 关注 */}
        <TabsContent value="following">
          <div className="grid gap-3 md:grid-cols-2">
            {following.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="py-8 text-center text-muted-foreground">
                  暂无关注
                </CardContent>
              </Card>
            ) : (
              following.map((follow) => (
                <Link key={follow.id} href={`/profile/${follow.user.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="py-3 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={follow.user.name_color ? nameBgStyles[follow.user.name_color] : "bg-gradient-to-br from-blue-500 to-purple-600"}>
                          {follow.user.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className={`font-medium ${follow.user.name_color ? nameColorStyles[follow.user.name_color] : ""}`}>
                          {follow.user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          关注于 {formatDate(follow.created_at)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 提醒用户对话框 */}
      {showWarningDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>提醒用户</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">提醒级别</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(warningLevelConfig).map(([level, config]) => (
                    <Button
                      key={level}
                      type="button"
                      variant={warningLevel === level ? "default" : "outline"}
                      className={`flex flex-col h-auto py-2 ${warningLevel === level ? config.color : ""}`}
                      onClick={() => setWarningLevel(level)}
                    >
                      <span className="text-lg font-bold">{level}</span>
                      <span className="text-xs">-{config.ratingPenalty}</span>
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {warningLevelConfig[warningLevel]?.label}：-{warningLevelConfig[warningLevel]?.ratingPenalty} Rating
                  {warningLevelConfig[warningLevel]?.restrictions.length > 0 && 
                    `，不可发布 ${warningLevelConfig[warningLevel].restrictions.join("、")}`
                  }
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">提醒原因</label>
                <textarea
                  className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                  placeholder="请输入提醒原因..."
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWarningDialog(false);
                    setWarningReason("");
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleWarning}
                  disabled={warningLoading || !warningReason.trim()}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {warningLoading ? "处理中..." : "确认提醒"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
