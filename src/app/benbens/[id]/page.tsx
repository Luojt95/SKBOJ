"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Heart, MessageCircle, Trash2 } from "lucide-react";
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
    points?: number;
  };
}

interface Reply {
  id: number;
  content: string;
  author_id: number;
  likes: number;
  parent_id: number;
  reply_to_id?: number;
  reply_to_user_id?: number;
  created_at: string;
  author?: {
    id: number;
    username: string;
    role: string;
    points?: number;
  };
  replyToUser?: {
    id: number;
    username: string;
  };
}

interface User {
  id: number;
  username: string;
  role: string;
}

// 根据积分获取用户名颜色
function getPointsColor(points: number | undefined, role: string | undefined): string {
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

export default function BenbenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [benben, setBenben] = useState<Benben | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Reply | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

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
    fetchBenben();
    fetchReplies();
  }, [resolvedParams.id]);

  const fetchBenben = async () => {
    try {
      const res = await fetch(`/api/benbens/${resolvedParams.id}`);
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setBenben(data.benben);
    } catch (error) {
      console.error("Failed to fetch benben:", error);
      toast.error("获取犇犇失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    try {
      const res = await fetch(`/api/benbens?parentId=${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setReplies(data.benbens || []);
      }
    } catch (error) {
      console.error("Failed to fetch replies:", error);
    }
  };

  const postReply = async () => {
    if (!replyContent.trim() || !currentUser || posting) return;

    setPosting(true);
    try {
      const res = await fetch("/api/benbens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent.trim(),
          parentId: parseInt(resolvedParams.id),
          replyToId: replyingTo?.id,
          replyToUserId: replyingTo?.author_id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "发布失败");
      }

      const data = await res.json();
      setReplies(prev => [...prev, data.benben]);
      setReplyContent("");
      setReplyingTo(null);
      setBenben(prev => prev ? { ...prev, reply_count: prev.reply_count + 1 } : null);
      toast.success("回复成功");
    } catch (error: any) {
      toast.error(error.message || "发布失败");
    } finally {
      setPosting(false);
    }
  };

  const deleteBenben = async (id: number, isMain: boolean) => {
    if (!confirm("确定删除吗？")) return;

    try {
      const res = await fetch(`/api/benbens/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "删除失败");
      }

      if (isMain) {
        toast.success("已删除");
        router.push("/");
      } else {
        setReplies(prev => prev.filter(r => r.id !== id));
        setBenben(prev => prev ? { ...prev, reply_count: prev.reply_count - 1 } : null);
        toast.success("已删除");
      }
    } catch (error: any) {
      toast.error(error.message || "删除失败");
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
        if (benben && benben.id === id) {
          setBenben({ ...benben, likes: data.likes });
        } else {
          setReplies(prev =>
            prev.map(r => (r.id === id ? { ...r, likes: data.likes } : r))
          );
        }
      }
    } catch (error) {
      toast.error("点赞失败");
    }
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

  const canDelete = (authorId: number) => {
    if (!currentUser) return false;
    return (
      authorId === currentUser.id ||
      currentUser.role === "admin" ||
      currentUser.role === "super_admin"
    );
  };

  // 渲染内容，支持@提及高亮
  const renderContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_\u4e00-\u9fa5]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <span key={index} className="text-primary">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!benben) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">犇犇不存在</p>
            <Button className="mt-4" asChild>
              <Link href="/">返回首页</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const authorColorStyle = getPointsColor(benben.author?.points, benben.author?.role);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" className="mb-4" asChild>
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首页
        </Link>
      </Button>

      {/* 主犇犇 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Link href={`/profile/${benben.author_id}`}>
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                  {benben.author?.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href={`/profile/${benben.author_id}`}
                  className={`font-medium hover:underline ${authorColorStyle}`}
                >
                  {benben.author?.username || "未知用户"}
                </Link>
                {benben.author?.role === "admin" && (
                  <Badge className="bg-orange-500">管理员</Badge>
                )}
                {benben.author?.role === "super_admin" && (
                  <Badge variant="destructive">站长</Badge>
                )}
              </div>
              <p className="whitespace-pre-wrap mb-3 text-lg">
                {renderContent(benben.content)}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatDateTime(benben.created_at)}</span>
                  <button
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                    onClick={() => likeBenben(benben.id)}
                  >
                    <Heart className="h-4 w-4" />
                    {benben.likes}
                  </button>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {benben.reply_count}
                  </span>
                </div>
                {canDelete(benben.author_id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteBenben(benben.id, true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 回复区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">回复 ({replies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 发布回复 */}
          {currentUser ? (
            <div className="mb-6">
              {replyingTo && (
                <div className="mb-2 p-2 bg-muted rounded flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    回复 @{replyingTo.author?.username}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(null)}
                  >
                    取消
                  </Button>
                </div>
              )}
              <Textarea
                placeholder={replyingTo ? `回复 @${replyingTo.author?.username}...` : "写下你的回复..."}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="mb-2"
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {replyContent.length}/500
                </span>
                <Button onClick={postReply} disabled={posting || !replyContent.trim()}>
                  回复
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-muted rounded-lg text-center">
              <p className="text-muted-foreground mb-2">登录后可以回复</p>
              <Button variant="outline" asChild>
                <Link href="/login">去登录</Link>
              </Button>
            </div>
          )}

          {/* 回复列表 */}
          <div className="space-y-4">
            {replies.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                暂无回复，来说点什么吧
              </div>
            ) : (
              replies.map((reply) => {
                const replyAuthorColorStyle = getPointsColor(reply.author?.points, reply.author?.role);

                return (
                  <div key={reply.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-start gap-3">
                      <Link href={`/profile/${reply.author_id}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                            {reply.author?.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/profile/${reply.author_id}`}
                            className={`text-sm font-medium hover:underline ${replyAuthorColorStyle}`}
                          >
                            {reply.author?.username || "未知用户"}
                          </Link>
                          {reply.author?.role === "admin" && (
                            <Badge className="bg-orange-500 text-xs">管理员</Badge>
                          )}
                          {reply.author?.role === "super_admin" && (
                            <Badge variant="destructive" className="text-xs">站长</Badge>
                          )}
                          {reply.replyToUser && (
                            <span className="text-xs text-muted-foreground">
                              回复 <span className="text-primary">@{reply.replyToUser.username}</span>
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap text-sm mb-2">
                          {renderContent(reply.content)}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{formatDateTime(reply.created_at)}</span>
                            <button
                              className="flex items-center gap-1 hover:text-primary transition-colors"
                              onClick={() => likeBenben(reply.id)}
                            >
                              <Heart className="h-3 w-3" />
                              {reply.likes}
                            </button>
                            {currentUser && (
                              <button
                                className="hover:text-primary transition-colors"
                                onClick={() => setReplyingTo(reply)}
                              >
                                回复
                              </button>
                            )}
                          </div>
                          {canDelete(reply.author_id) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => deleteBenben(reply.id, false)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              删除
                            </Button>
                          )}
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
  );
}
