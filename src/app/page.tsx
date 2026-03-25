"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Trophy, Users, Zap, BookOpen, Rocket, MessageCircle, Heart, Send, Globe, UserPlus } from "lucide-react";
import { toast } from "sonner";

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

interface User {
  id: number;
  username: string;
  role: string;
  name_color?: string;
}

const features = [
  {
    icon: Code,
    title: "丰富题库",
    description: "涵盖入门到进阶的算法题目，支持多种难度标签筛选",
  },
  {
    icon: Trophy,
    title: "在线比赛",
    description: "支持OI/IOI赛制，实时排行榜，体验竞技乐趣",
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

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [benbens, setBenbens] = useState<Benben[]>([]);
  const [newBenben, setNewBenben] = useState("");
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查登录状态
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    fetchBenbens();
  }, [activeTab]);

  const fetchBenbens = async () => {
    try {
      const following = activeTab === "following" ? "true" : "";
      const res = await fetch(`/api/benbens?following=${following}`);
      if (res.ok) {
        const data = await res.json();
        setBenbens(data.benbens || []);
      }
    } catch (error) {
      console.error("Failed to fetch benbens:", error);
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
    return parts.map((part, index) => {
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
    });
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
              OIer的乐土
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link href="/problems">开始刷题</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register">注册账号</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

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
                  <Textarea
                    placeholder="发一条犇犇吧... 使用@用户名 可以提及用户"
                    value={newBenben}
                    onChange={(e) => setNewBenben(e.target.value)}
                    className="mb-2"
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {newBenben.length}/500
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
                    const authorColorStyle = benben.author?.name_color 
                      ? nameColorStyles[benben.author.name_color] || "" 
                      : "";
                    const authorBgStyle = benben.author?.name_color 
                      ? nameBgStyles[benben.author.name_color] || "bg-gradient-to-br from-blue-500 to-purple-600" 
                      : "bg-gradient-to-br from-blue-500 to-purple-600";

                    return (
                      <div key={benben.id} className="p-4 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <Link href={`/profile/${benben.author_id}`}>
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className={authorBgStyle}>
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
                              {benben.author?.role === "admin" && (
                                <Badge className="bg-orange-500 text-xs">管理员</Badge>
                              )}
                              {benben.author?.role === "super_admin" && (
                                <Badge variant="destructive" className="text-xs">站长</Badge>
                              )}
                            </div>
                            <p className="whitespace-pre-wrap mb-2">
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
