"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Check, Trash2, User, MessageCircle, Ticket, Heart, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  content?: string;
  related_id?: number;
  related_type?: string;
  is_read: boolean;
  created_at: string;
}

const notificationIcons: Record<string, any> = {
  ticket_reply: Ticket,
  benben_mention: MessageCircle,
  follow: User,
  like: Heart,
  system: Bell,
};

const notificationLabels: Record<string, string> = {
  ticket_reply: "工单回复",
  benben_mention: "犇犇提及",
  follow: "新粉丝",
  like: "点赞",
  system: "系统通知",
};

const notificationColors: Record<string, string> = {
  ticket_reply: "bg-blue-500",
  benben_mention: "bg-green-500",
  follow: "bg-pink-500",
  like: "bg-red-500",
  system: "bg-gray-500",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error("获取通知失败");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId?: number) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          notificationId ? { notificationId } : { markAll: true }
        ),
      });

      if (!res.ok) throw new Error("操作失败");

      if (notificationId) {
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
      toast.success("已标记为已读");
    } catch (error) {
      toast.error("操作失败");
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      const res = await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("删除失败");

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success("已删除");
    } catch (error) {
      toast.error("删除失败");
    }
  };

  const deleteReadNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("删除失败");

      setNotifications(prev => prev.filter(n => !n.is_read));
      toast.success("已删除所有已读通知");
    } catch (error) {
      toast.error("删除失败");
    }
  };

  const getNotificationLink = (notification: Notification) => {
    switch (notification.related_type) {
      case "ticket":
        return `/tickets/${notification.related_id}`;
      case "benben":
        return `/benbens/${notification.related_id}`;
      case "user":
        return `/profile/${notification.related_id}`;
      default:
        return "#";
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

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.is_read;
    return n.type === activeTab;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>消息通知</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} 条未读</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAsRead()}>
                <Check className="h-4 w-4 mr-1" />
                全部已读
              </Button>
            )}
            {notifications.some(n => n.is_read) && (
              <Button variant="ghost" size="sm" onClick={deleteReadNotifications}>
                <Trash2 className="h-4 w-4 mr-1" />
                清除已读
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="unread">未读</TabsTrigger>
              <TabsTrigger value="follow">关注</TabsTrigger>
              <TabsTrigger value="benben_mention">@提及</TabsTrigger>
              <TabsTrigger value="ticket_reply">工单</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredNotifications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  暂无通知
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => {
                    const Icon = notificationIcons[notification.type] || Bell;
                    const colorClass = notificationColors[notification.type] || "bg-gray-500";
                    
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border ${
                          notification.is_read ? "bg-background" : "bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${colorClass} text-white`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                {notificationLabels[notification.type] || "通知"}
                              </span>
                              {!notification.is_read && (
                                <Badge variant="secondary" className="text-xs">
                                  未读
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium">{notification.title}</p>
                            {notification.content && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {notification.content}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(notification.created_at)}
                              </span>
                              {notification.related_id && (
                                <Link
                                  href={getNotificationLink(notification)}
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  查看详情
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
