"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ThumbsUp, MessageSquare, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Discussion {
  id: number;
  title: string;
  content: string;
  author_id: number;
  problem_id: number | null;
  parent_id: number | null;
  likes: number;
  created_at: string;
  updated_at: string | null;
  users?: {
    id: number;
    username: string;
    role: string;
  };
}

interface Reply {
  id: number;
  title: string;
  content: string;
  author_id: number;
  parent_id: number;
  likes: number;
  created_at: string;
  users?: {
    id: number;
    username: string;
    role: string;
  };
}

interface User {
  id: number;
  username: string;
  role: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("zh-CN");
}

export default function DiscussionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [likedDiscussions, setLikedDiscussions] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [discussionRes, userRes] = await Promise.all([
          fetch(`/api/discussions/${params.id}`),
          fetch("/api/auth/me"),
        ]);

        if (discussionRes.ok) {
          const data = await discussionRes.json();
          setDiscussion(data.discussion);
          
          // 获取回复
          if (data.discussion) {
            const repliesRes = await fetch(`/api/discussions/${params.id}/replies`);
            if (repliesRes.ok) {
              const repliesData = await repliesRes.json();
              setReplies(repliesData.replies || []);
            }
          }
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const handleReply = async () => {
    if (!user) {
      toast.error("请先登录");
      router.push("/login");
      return;
    }

    if (!replyContent.trim()) {
      toast.error("请输入回复内容");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `回复: ${discussion?.title}`,
          content: replyContent,
          parentId: discussion?.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("回复成功");
        setReplies([data.discussion, ...replies]);
        setReplyContent("");
        // 触发积分变化事件，让导航栏更新积分显示
        window.dispatchEvent(new CustomEvent("pointsChanged"));
      } else {
        toast.error(data.error || "回复失败");
      }
    } catch {
      toast.error("回复失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除这条讨论吗？")) return;

    try {
      const res = await fetch(`/api/discussions/${params.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("删除成功");
        router.push("/discussions");
      } else {
        const data = await res.json();
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!confirm("确定要删除这条回复吗？")) return;

    try {
      const res = await fetch(`/api/discussions/${replyId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("删除成功");
        setReplies(replies.filter((r) => r.id !== replyId));
      } else {
        const data = await res.json();
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const handleLike = async (targetId: number, isReply: boolean = false) => {
    if (!user) {
      toast.error("请先登录");
      router.push("/login");
      return;
    }

    const isLiked = likedDiscussions.has(targetId);
    const action = isLiked ? "unlike" : "like";

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: isReply ? "discussion" : "discussion",
          targetId,
          action,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLikedDiscussions(prev => {
          const newSet = new Set(prev);
          if (data.liked) {
            newSet.add(targetId);
          } else {
            newSet.delete(targetId);
          }
          return newSet;
        });
        
        // 更新点赞数
        if (isReply) {
          setReplies(prev =>
            prev.map(r =>
              r.id === targetId ? { ...r, likes: data.likes } : r
            )
          );
        } else if (discussion) {
          setDiscussion({ ...discussion, likes: data.likes });
        }
      }
    } catch (error) {
      toast.error("操作失败");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  if (!discussion) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>讨论不存在</p>
        <Button className="mt-4" asChild>
          <Link href="/discussions">返回讨论列表</Link>
        </Button>
      </div>
    );
  }

  const canDelete = user && (
    user.role === "super_admin" ||
    (user.role === "admin" && discussion.users?.role !== "super_admin") ||
    user.id === discussion.author_id
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" className="mb-4" asChild>
        <Link href="/discussions">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回讨论列表
        </Link>
      </Button>

      {/* 主讨论 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-2xl">{discussion.title}</CardTitle>
            {canDelete && (
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>
              作者：
              {discussion.users ? (
                <Link
                  href={`/profile/${discussion.users.id}`}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  {discussion.users.username}
                </Link>
              ) : (
                `用户${discussion.author_id}`
              )}
            </span>
            <span>{formatDate(discussion.created_at)}</span>
            <button
              onClick={() => handleLike(discussion.id)}
              className={`flex items-center gap-1 transition-colors ${
                likedDiscussions.has(discussion.id) 
                  ? "text-red-500" 
                  : "text-muted-foreground hover:text-red-500"
              }`}
            >
              {likedDiscussions.has(discussion.id) ? "❤️" : "🤍"} {discussion.likes}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere word-break-break-all">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {discussion.content}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* 回复区域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            发表回复
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={replyContent}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 500) {
                      setReplyContent(val);
                      // 自动调整高度
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm resize-none min-h-[80px] max-h-[300px] overflow-y-auto break-words overflow-wrap-anywhere"
                  placeholder="支持 Markdown 格式... (最多500字符)"
                  disabled={isSubmitting}
                  rows={3}
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                />
                <div className="text-xs text-muted-foreground text-right mt-1">
                  {replyContent.length}/500
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleReply}
                  disabled={isSubmitting || !replyContent.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {isSubmitting ? "发送中..." : "发送回复"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <p>请先登录后再回复</p>
              <Button className="mt-2" asChild>
                <Link href="/login">登录</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 回复列表 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">全部回复 ({replies.length})</h3>
        {replies.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无回复</p>
            </CardContent>
          </Card>
        ) : (
          <div className="max-h-[400px] overflow-y-auto rounded-lg border">
            {replies.map((reply) => (
              <Card key={reply.id} className="m-2 mb-0 border-0 border-b last:border-b-0">
                <CardContent className="py-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    {reply.users ? (
                      <Link
                        href={`/profile/${reply.users.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        {reply.users.username}
                      </Link>
                    ) : (
                      <span className="font-medium">用户{reply.author_id}</span>
                    )}
                    <span className="text-muted-foreground">
                      {formatDate(reply.created_at)}
                    </span>
                  </div>
                  {user && (user.id === reply.author_id || user.role === "admin" || user.role === "super_admin") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReply(reply.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere word-break-break-all">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {reply.content}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
