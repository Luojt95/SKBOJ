"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Trophy, Users, Zap, BookOpen, Rocket, MessageCircle, Heart, Send, Globe, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { getUserNameColorByRatingAndRole, getRatingConfig } from "@/lib/rating";

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
    points?: number;
    avatar?: string;
    rating?: number;
  };
}

interface User {
  id: number;
  username: string;
  role: string;
  points?: number;
}

interface DailyLimits {
  checkedIn: boolean;
  problems_created: number;
  benbens_created: number;
  messages_sent: number;
  contests_created: number;
  discussions_created: number;
  shares_created: number;
  tickets_created: number;
  replies_created: number;
}

const LIMITS = {
  problems_created: 3,
  benbens_created: 3,
  messages_sent: 5,
  contests_created: 1,
  discussions_created: 1,
  shares_created: 2,
  tickets_created: 1,
  replies_created: 5,
};

const features = [
  {
    icon: Code,
    title: "丰富题库",
    description: "涵盖各个领域与难度的题目，支持多种难度标签筛选",
  },
  {
    icon: Trophy,
    title: "在线比赛",
    description: "支持OI/IOI/CS赛制，实时排行榜，体验竞技乐趣",
  },
  {
    icon: Users,
    title: "社区交流",
    description: "讨论区互动，题解分享，共同进步",
  },
  {
    icon: Zap,
    title: "即时评测",
    description: "支持C++、Python、HTML代码在线调试，快速反馈",
  },
  {
    icon: BookOpen,
    title: "题解系统",
    description: "查看优质题解，学习解题思路和技巧",
  },
  {
    icon: Rocket,
    title: "代码分享",
    description: "分享你的代码作品，与OIer们交流学习",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [benbens, setBenbens] = useState<Benben[]>([]);
  const [newBenben, setNewBenben] = useState("");
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dailyLimits, setDailyLimits] = useState<DailyLimits | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [siteConfig, setSiteConfig] = useState<{hero_subtitle?: string; hero_description?: string; notice?: string} | null>(null);

  useEffect(() => {
    // 初始化管理员账号
    fetch("/api/init").catch(() => {});
    // 检查登录状态
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);

          // 检查是否已签到
          const checkInRes = await fetch("/api/check-in");
          if (checkInRes.ok) {
            const checkInData = await checkInRes.json();
            setCheckedIn(checkInData.checkedIn);
          }

          // 获取每日限制
          if (data.user && data.user.role !== 'super_admin') {
            fetchDailyLimits();
          }
        }
      } catch (error) {
        setDbError("无法连接到服务器，请检查网络连接");
      }
    };
    checkAuth();
    
    // 获取站点配置
    const fetchSiteConfig = async () => {
      try {
        const res = await fetch('/api/site-config');
        if (res.ok) {
          const data = await res.json();
          setSiteConfig(data.config);
        }
      } catch (error) {
        console.error('获取站点配置失败:', error);
      }
    };
    fetchSiteConfig();
  }, []);

  const fetchDailyLimits = async () => {
    setLimitsLoading(true);
    try {
      const res = await fetch('/api/daily-limits');
      if (res.ok) {
        const data = await res.json();
        setDailyLimits(data.limits);
      }
    } catch (error) {
      console.error('获取每日限制失败:', error);
    } finally {
      setLimitsLoading(false);
    }
  };

  useEffect(() => {
    fetchBenbens();
  }, [activeTab]);

  // 打卡
  const handleCheckIn = async () => {
    if (!user) {
      toast.error("请先登录");
      router.push("/login");
      return;
    }

    if (checkingIn) return;

    setCheckingIn(true);
    try {
      const res = await fetch("/api/check-in", { method: "POST" });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message);
        setCheckedIn(true);
        // 刷新每日限制
        await fetchDailyLimits();
      } else {
        toast.error(data.message || "签到失败");
      }
    } catch (error) {
      toast.error("签到失败");
    } finally {
      setCheckingIn(false);
    }
  };

  const fetchBenbens = async () => {
    try {
      const following = activeTab === "following" ? "true" : "";
      const res = await fetch(`/api/benbens?following=${following}`);
      if (res.ok) {
        const data = await res.json();
        setBenbens(data.benbens || []);
        // 如果之前有错误但这次成功了，清除错误
        if (dbError) {
          setDbError(null);
        }
      } else {
        // 如果是 500 错误，可能是数据库问题
        if (res.status >= 500) {
          setDbError("服务器错误，请稍后重试");
        }
      }
    } catch (error) {
      console.error("Failed to fetch benbens:", error);
      setDbError("网络连接失败，请检查网络");
    } finally {
      setLoading(false);
    }
  };

  const postBenben = async () => {
    if (!newBenben.trim() || !user || posting) return;

    setPosting(true);
    try {
      const res = await fetch("/api/benbens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newBenben.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "发布失败");
      }

      const data = await res.json();
      setBenbens(prev => [data.benben, ...prev]);
      setNewBenben("");
      toast.success("发布成功");
    } catch (error: any) {
      toast.error(error.message || "发布失败");
    } finally {
      setPosting(false);
    }
  };

  const likeBenben = async (id: number) => {
    try {
      const res = await fetch(`/api/benbens/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like" }),
      });

      if (res.ok) {
        const data = await res.json();
        setBenbens(prev =>
          prev.map(b => (b.id === id ? { ...b, likes: data.likes } : b))
        );
      }
    } catch (error) {
      toast.error("点赞失败");
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 渲染内容，支持@提及高亮
  const renderContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_\u4e00-\u9fa5]+)/g);
    return (
      <span className="break-words overflow-wrap-anywhere word-break-break-all">
        {parts.map((part, index) => {
          if (part.startsWith("@")) {
            const username = part.slice(1);
            return (
              <Link
                key={index}
                href={`/profile?username=${username}`}
                className="text-primary hover:underline"
              >
                {part}
              </Link>
            );
          }
          return part;
        })}
      </span>
    );
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,transparent,black)] dark:bg-grid-slate-700/25" />
        <div className="container mx-auto px-4 py-24 lg:py-32 relative">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="currentColor">
                <path d="M12 4C6 4 2 9 2 12s4 8 10 8c1 0 2-.5 2-.5 3 2 6 1 6 1s-2-2-2-4c0 0 4-2 4-4.5S16 4 12 4zM7 11c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
              </svg>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              欢迎来到{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SKBOJ
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
              {siteConfig?.hero_subtitle || 'OIer的乐土'}
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={handleCheckIn}
                disabled={checkingIn || checkedIn}
              >
                {checkingIn ? "签到中..." : checkedIn ? "今日已打卡" : "每日打卡"}
              </Button>
            </div>

            {/* 每日限制显示 */}
            {user && user.role !== 'super_admin' && dailyLimits && (
              <div className="mt-8 w-full max-w-2xl">
                <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      今日限额
                      {!dailyLimits.checkedIn && (
                        <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-700 border-orange-200">
                          请先打卡解锁
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!dailyLimits.checkedIn ? (
                      <p className="text-center text-muted-foreground py-4">
                        每日打卡后解锁所有功能使用次数
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {dailyLimits.problems_created}/{LIMITS.problems_created}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">创建题目</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {dailyLimits.benbens_created}/{LIMITS.benbens_created}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">发犇犇</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {dailyLimits.messages_sent}/{LIMITS.messages_sent}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">发送私信</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {dailyLimits.contests_created}/{LIMITS.contests_created}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">创建比赛</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-pink-50 dark:bg-pink-950/20">
                          <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                            {dailyLimits.discussions_created}/{LIMITS.discussions_created}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">创建讨论</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/20">
                          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                            {dailyLimits.shares_created}/{LIMITS.shares_created}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">分享代码</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {dailyLimits.tickets_created}/{LIMITS.tickets_created}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">提交工单</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            {dailyLimits.replies_created}/{LIMITS.replies_created}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">回复次数</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 数据库连接错误提示 */}
      {dbError && (
        <section className="py-8 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200 text-lg">
                  ⚠️ 数据库连接异常
                </CardTitle>
              </CardHeader>
              <CardContent className="text-red-900 dark:text-red-100">
                <p className="mb-2">
                  系统检测到数据库连接失败，可能是 Supabase 服务暂时不可用。
                </p>
                <p className="text-sm opacity-80 mb-4">
                  错误信息: {dbError}
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    刷新页面
                  </Button>
                  <Link href="/maintenance">
                    <Button size="sm" variant="outline">
                      查看系统状态
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* 犇犇区域 */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  犇犇
                </CardTitle>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="all" className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      全部
                    </TabsTrigger>
                    <TabsTrigger value="following" className="flex items-center gap-1">
                      <UserPlus className="h-4 w-4" />
                      关注
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {/* 发布犇犇 */}
              {user ? (
                <div className="mb-6">
                  <textarea
                    placeholder="发一条犇犇吧... 使用@用户名 可以提及用户"
                    value={newBenben}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 80) {
                        setNewBenben(val);
                        // 自动调整高度
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm resize-none overflow-hidden min-h-[60px] max-h-[120px] mb-2"
                    disabled={posting}
                    rows={2}
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {newBenben.length}/80
                    </span>
                    <Button onClick={postBenben} disabled={posting || !newBenben.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      发布
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-muted rounded-lg text-center">
                  <p className="text-muted-foreground mb-2">登录后可以发布犇犇</p>
                  <Button variant="outline" asChild>
                    <Link href="/login">去登录</Link>
                  </Button>
                </div>
              )}

              {/* 犇犇列表 */}
              <div className="space-y-4">
                {loading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    加载中...
                  </div>
                ) : benbens.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    {activeTab === "following" ? "你还没有关注任何人，或关注的人还没有发过犇犇" : "暂无犇犇，来发第一条吧"}
                  </div>
                ) : (
                  benbens.map((benben) => {
                    const authorColorStyle = getUserNameColorByRatingAndRole(benben.author?.rating, benben.author?.role);

                    return (
                      <div key={benben.id} className="p-4 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <Link href={`/profile/${benben.author_id}`}>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={benben.author?.avatar} alt={benben.author?.username} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                                {benben.author?.username?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Link 
                                href={`/profile/${benben.author_id}`}
                                className={`font-medium hover:underline ${authorColorStyle}`}
                              >
                                {benben.author?.username || "未知用户"}
                              </Link>
                              {benben.author?.rating !== undefined && benben.author?.rating !== null && (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-mono h-5 px-1"
                                  style={{ borderColor: getRatingConfig(benben.author.rating).color, color: getRatingConfig(benben.author.rating).color }}
                                >
                                  {benben.author.rating}
                                </Badge>
                              )}
                              {benben.author?.role === "admin" && (
                                <Badge className="bg-orange-500 text-xs">管理员</Badge>
                              )}
                              {benben.author?.role === "super_admin" && (
                                <Badge variant="destructive" className="text-xs">站长</Badge>
                              )}
                            </div>
                            <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere word-break-break-all mb-2 max-w-full">
                              {renderContent(benben.content)}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatDateTime(benben.created_at)}</span>
                              <button
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                                onClick={() => likeBenben(benben.id)}
                              >
                                <Heart className="h-4 w-4" />
                                {benben.likes}
                              </button>
                              <Link
                                href={`/benbens/${benben.id}`}
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <MessageCircle className="h-4 w-4" />
                                {benben.reply_count}
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">平台功能</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              SKBOJ 提供全方位的算法竞赛支持，助你在OI之路上更进一步
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
