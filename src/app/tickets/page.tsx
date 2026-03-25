"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Ticket, Plus, Check, X, Clock } from "lucide-react";

interface TicketData {
  id: number;
  title: string;
  content: string;
  type: string;
  problem_id: number | null;
  author_id: number;
  status: string;
  handler_id: number | null;
  reply: string | null;
  created_at: string;
  users?: { username: string };
  problems?: { title: string };
}

interface User {
  id: number;
  username: string;
  role: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  accepted: "bg-green-500",
  rejected: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "待处理",
  accepted: "已接受",
  rejected: "已拒绝",
};

const typeLabels: Record<string, string> = {
  suggestion: "建议",
};

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    content: "",
    type: "suggestion",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsRes, userRes] = await Promise.all([
          fetch("/api/tickets"),
          fetch("/api/auth/me"),
        ]);

        if (ticketsRes.ok) {
          const data = await ticketsRes.json();
          setTickets(data.tickets || []);
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

  const handleCreateTicket = async () => {
    if (!user) {
      toast.error("请先登录");
      router.push("/login");
      return;
    }

    if (!newTicket.title.trim() || !newTicket.content.trim()) {
      toast.error("请填写标题和内容");
      return;
    }

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTicket),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("提交成功");
        setTickets([data.ticket, ...tickets]);
        setIsDialogOpen(false);
        setNewTicket({ title: "", content: "", type: "suggestion" });
      } else {
        toast.error(data.error || "提交失败");
      }
    } catch {
      toast.error("提交失败");
    }
  };

  const handleUpdateStatus = async (id: number, status: string, reply?: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reply }),
      });

      if (res.ok) {
        toast.success("处理成功");
        const data = await res.json();
        setTickets(tickets.map((t) => (t.id === id ? data.ticket : t)));
      } else {
        toast.error("处理失败");
      }
    } catch {
      toast.error("处理失败");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN");
  };

  const canHandle = user && (user.role === "admin" || user.role === "super_admin");

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">工单系统</h1>
          <p className="text-muted-foreground mt-1">提交建议或申请题目公开</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="h-4 w-4 mr-2" />
              提交工单
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>提交工单</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>类型</Label>
                <Select
                  value={newTicket.type}
                  onValueChange={(value) =>
                    setNewTicket({ ...newTicket, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggestion">建议</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>标题</Label>
                <Input
                  value={newTicket.title}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, title: e.target.value })
                  }
                  placeholder="请输入标题"
                />
              </div>
              <div className="space-y-2">
                <Label>内容</Label>
                <Textarea
                  value={newTicket.content}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, content: e.target.value })
                  }
                  placeholder="请详细描述"
                  rows={5}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateTicket}>提交</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 工单列表 */}
      <div className="space-y-4">
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无工单</p>
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{ticket.title}</h3>
                        <Badge variant="outline">{typeLabels[ticket.type]}</Badge>
                        <Badge className={`${statusColors[ticket.status]} text-white`}>
                          {statusLabels[ticket.status]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-2 line-clamp-2">{ticket.content}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          提交者：{(ticket as any).users ? (
                            <span className="text-blue-600 dark:text-blue-400">
                              {(ticket as any).users.username}
                            </span>
                          ) : (
                            `用户${ticket.author_id}`
                          )}
                        </span>
                        <span>{formatDate(ticket.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
