"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Plus, Search, ThumbsUp, Trash2, User } from "lucide-react";

interface Discussion {
  id: number;
  title: string;
  content: string;
  author_id: number;
  problem_id: number | null;
  parent_id: number | null;
  likes: number;
  created_at: string;
  users?: { username: string };
  problems?: { title: string };
}

interface User {
  id: number;
  username: string;
  role: string;
}

export default function DiscussionsPage() {
  const router = useRouter();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({
    title: "",
    content: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [discussionsRes, userRes] = await Promise.all([
          fetch("/api/discussions"),
          fetch("/api/auth/me"),
        ]);

        if (discussionsRes.ok) {
          const data = await discussionsRes.json();
          setDiscussions(data.discussions || []);
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
  }, []);

  const filteredDiscussions = discussions.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateDiscussion = async () => {
    if (!user) {
      toast.error("请先登录");
      router.push("/login");
      return;
    }

    if (!newDiscussion.title.trim() || !newDiscussion.content.trim()) {
      toast.error("请填写标题和内容");
      return;
    }

    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDiscussion),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("发布成功");
        setDiscussions([data.discussion, ...discussions]);
        setIsDialogOpen(false);
        setNewDiscussion({ title: "", content: "" });
      } else {
        toast.error(data.error || "发布失败");
      }
    } catch {
      toast.error("发布失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这条讨论吗？")) return;

    try {
      const res = await fetch(`/api/discussions/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("删除成功");
        setDiscussions(discussions.filter((d) => d.id !== id));
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canDelete = (discussion: Discussion) => {
    return (
      user &&
      (user.role === "admin" ||
        user.role === "super_admin" ||
        user.id === discussion.author_id)
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">讨论区</h1>
          <p className="text-muted-foreground mt-1">交流算法心得，分享学习经验</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="h-4 w-4 mr-2" />
              发布讨论
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>发布新讨论</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">标题</label>
                <Input
                  value={newDiscussion.title}
                  onChange={(e) =>
                    setNewDiscussion({ ...newDiscussion, title: e.target.value })
                  }
                  placeholder="请输入标题"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">内容</label>
                <Textarea
                  value={newDiscussion.content}
                  onChange={(e) =>
                    setNewDiscussion({ ...newDiscussion, content: e.target.value })
                  }
                  placeholder="请输入内容"
                  rows={6}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  取消
                </Button>
                <Button onClick={handleCreateDiscussion}>发布</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索讨论..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 讨论列表 */}
      <div className="space-y-4">
        {filteredDiscussions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无讨论</p>
            </CardContent>
          </Card>
        ) : (
          filteredDiscussions.map((discussion) => (
            <Card key={discussion.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link href={`/discussions/${discussion.id}`}>
                      <h3 className="font-semibold text-lg hover:text-primary cursor-pointer">
                        {discussion.title}
                      </h3>
                    </Link>
                    <p className="text-muted-foreground mt-1 line-clamp-2">
                      {discussion.content}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {(discussion as any).users?.username || `用户${discussion.author_id}`}
                      </span>
                      <span>{formatDate(discussion.created_at)}</span>
                      {discussion.problem_id && (
                        <Badge variant="outline">
                          {(discussion as any).problems?.title || `题目${discussion.problem_id}`}
                        </Badge>
                      )}
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        {discussion.likes}
                      </span>
                    </div>
                  </div>
                  {canDelete(discussion) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(discussion.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
