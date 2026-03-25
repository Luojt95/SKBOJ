"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Ticket {
  id: number;
  title: string;
  content: string;
  type: string;
  problem_id: number | null;
  author_id: number;
  status: string;
  created_at: string;
  updated_at: string | null;
  users?: {
    id: number;
    username: string;
    role: string;
  };
  problems?: {
    id: number;
    title: string;
  };
}

interface User {
  id: number;
  username: string;
  role: string;
}

const typeLabels: Record<string, string> = {
  suggestion: "建议反馈",
  bug: "Bug反馈",
  other: "其他",
};

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "待处理", icon: Clock, color: "bg-yellow-500" },
  accepted: { label: "已受理", icon: CheckCircle, color: "bg-green-500" },
  rejected: { label: "已拒绝", icon: XCircle, color: "bg-red-500" },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("zh-CN");
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketRes, userRes] = await Promise.all([
          fetch(`/api/tickets/${params.id}`),
          fetch("/api/auth/me"),
        ]);

        if (ticketRes.ok) {
          const data = await ticketRes.json();
          setTicket(data.ticket);
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

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;

    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("状态已更新");
        setTicket({ ...ticket, status: newStatus });
      } else {
        toast.error(data.error || "更新失败");
      }
    } catch {
      toast.error("更新失败");
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除这个工单吗？")) return;

    try {
      const res = await fetch(`/api/tickets/${params.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("删除成功");
        router.push("/tickets");
      } else {
        const data = await res.json();
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>工单不存在</p>
        <Button className="mt-4" asChild>
          <Link href="/tickets">返回工单列表</Link>
        </Button>
      </div>
    );
  }

  const statusInfo = statusConfig[ticket.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  const canManage = user && (user.role === "admin" || user.role === "super_admin");
  const canDelete = user && (
    user.role === "super_admin" ||
    (user.role === "admin" && ticket.users?.role !== "super_admin") ||
    user.id === ticket.author_id
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" className="mb-4" asChild>
        <Link href="/tickets">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回工单列表
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{ticket.title}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{typeLabels[ticket.type] || ticket.type}</Badge>
                <Badge className={`${statusInfo.color} text-white`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>
              提交者：
              {ticket.users ? (
                <Link
                  href={`/profile/${ticket.users.id}`}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  {ticket.users.username}
                </Link>
              ) : (
                `用户${ticket.author_id}`
              )}
            </span>
            <span>{formatDate(ticket.created_at)}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {ticket.content}
            </ReactMarkdown>
          </div>

          {ticket.problems && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">相关题目：</span>
              <Link
                href={`/problems/${ticket.problems.id}`}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 ml-2"
              >
                {ticket.problems.title}
              </Link>
            </div>
          )}

          {canManage && ticket.status === "pending" && (
            <div className="mt-4 pt-4 border-t flex gap-2">
              <Button
                variant="outline"
                className="bg-green-500 text-white hover:bg-green-600"
                onClick={() => handleStatusChange("accepted")}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                受理工单
              </Button>
              <Button
                variant="outline"
                className="bg-red-500 text-white hover:bg-red-600"
                onClick={() => handleStatusChange("rejected")}
              >
                <XCircle className="h-4 w-4 mr-2" />
                拒绝工单
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
