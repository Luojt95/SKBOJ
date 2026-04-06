"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Mail, Trash2, User } from "lucide-react";
import { toast } from "sonner";

interface Conversation {
  user: {
    id: number;
    username: string;
    role: string;
    name_color?: string;
    points?: number;
  };
  lastMessage: {
    id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    created_at: string;
  };
  unreadCount: number;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: number;
    username: string;
    role: string;
    name_color?: string;
  };
}

interface OtherUser {
  id: number;
  username: string;
  role: string;
  name_color?: string;
}

// 根据积分获取颜色
function getPointsColor(points: number | undefined, role: string | undefined): string {
  if (role === "super_admin" || role === "admin") {
    return "text-purple-500";
  }

  const p = points || 0;

  if (p <= 0) return "text-gray-500";
  if (p <= 10) return "text-sky-400";
  if (p <= 20) return "text-blue-600";
  if (p <= 50) return "text-green-500";
  if (p <= 100) return "text-yellow-500";
  if (p <= 200) return "text-orange-500";
  if (p <= 500) return "text-red-500";
  return "text-amber-400";
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

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchUsername, setSearchUsername] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 获取当前用户并检查登录状态
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        } else {
          // 未登录，重定向到登录页
          router.push("/login");
        }
      } catch {
        router.push("/login");
      }
    };
    fetchCurrentUser();
  }, [router]);

  useEffect(() => {
    // 只有在用户已登录时才获取会话列表
    if (!currentUser) return;
    fetchConversations();
  }, [currentUser]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast.error("获取会话失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: number) => {
    try {
      const res = await fetch(`/api/messages?with=${userId}`);
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setMessages(data.messages || []);
      setSelectedUser(data.otherUser);
      
      // 更新会话列表中的未读数
      setConversations(prev =>
        prev.map(c =>
          c.user.id === userId ? { ...c, unreadCount: 0 } : c
        )
      );
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast.error("获取消息失败");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          content: newMessage.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "发送失败");
      }

      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      setNewMessage("");
      
      // 更新会话列表
      setConversations(prev => {
        const existing = prev.find(c => c.user.id === selectedUser.id);
        if (existing) {
          return prev.map(c =>
            c.user.id === selectedUser.id
              ? { ...c, lastMessage: data.message }
              : c
          ).sort((a, b) => 
            new Date(b.lastMessage.created_at).getTime() - 
            new Date(a.lastMessage.created_at).getTime()
          );
        }
        return [
          {
            user: selectedUser,
            lastMessage: data.message,
            unreadCount: 0,
          },
          ...prev,
        ];
      });
    } catch (error: any) {
      toast.error(error.message || "发送失败");
    } finally {
      setSending(false);
    }
  };

  const startNewConversation = async () => {
    if (!searchUsername.trim()) return;

    try {
      // 搜索用户
      const res = await fetch(`/api/users/search?username=${encodeURIComponent(searchUsername.trim())}`);
      if (!res.ok) throw new Error("查找失败");
      const data = await res.json();
      
      // 精确匹配用户名
      const user = data.users?.find(
        (u: any) => u.username.toLowerCase() === searchUsername.trim().toLowerCase()
      );

      if (!user) {
        toast.error("用户不存在");
        return;
      }

      if (user.id === currentUser?.id) {
        toast.error("不能给自己发私信");
        return;
      }

      setSelectedUser(user);
      setMessages([]);
      setSearchUsername("");
      
      // 如果已有会话，加载消息
      const existingConv = conversations.find(c => c.user.id === user.id);
      if (existingConv) {
        fetchMessages(user.id);
      }
    } catch (error) {
      toast.error("查找用户失败");
    }
  };

  const deleteConversation = async (userId: number) => {
    if (!confirm("确定删除此会话吗？")) return;

    try {
      const res = await fetch(`/api/messages?with=${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("删除失败");

      setConversations(prev => prev.filter(c => c.user.id !== userId));
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
        setMessages([]);
      }
      toast.success("已删除会话");
    } catch (error) {
      toast.error("删除失败");
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="animate-pulse grid grid-cols-3 gap-4 h-[600px]">
          <div className="bg-muted rounded-lg" />
          <div className="col-span-2 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Card className="h-[700px]">
        <CardHeader className="flex flex-row items-center gap-2 border-b">
          <Mail className="h-5 w-5" />
          <CardTitle>私信</CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-60px)]">
          <div className="grid grid-cols-3 h-full">
            {/* 会话列表 */}
            <div className="border-r flex flex-col">
              {/* 搜索新用户 */}
              <div className="p-3 border-b">
                <div className="flex gap-2">
                  <Input
                    placeholder="输入用户名"
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && startNewConversation()}
                  />
                  <Button size="icon" onClick={startNewConversation}>
                    <User className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 会话列表 */}
              <ScrollArea className="flex-1">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    暂无私信
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversations.map((conv) => {
                      const colorClass = getPointsColor(conv.user.points, conv.user.role);
                      const userBgStyle = conv.user.name_color ? nameBgStyles[conv.user.name_color] || "bg-gradient-to-br from-blue-500 to-purple-600" : "bg-gradient-to-br from-blue-500 to-purple-600";
                      
                      return (
                        <div
                          key={conv.user.id}
                          className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedUser?.id === conv.user.id ? "bg-muted" : ""
                          }`}
                          onClick={() => fetchMessages(conv.user.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className={userBgStyle}>
                                  {conv.user.username[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {conv.unreadCount > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                                >
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={`font-medium truncate ${colorClass}`}>
                                  {conv.user.username}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteConversation(conv.user.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessage.sender_id === currentUser?.id ? "你: " : ""}
                                {conv.lastMessage.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDateTime(conv.lastMessage.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* 消息区域 */}
            <div className="col-span-2 flex flex-col">
              {selectedUser ? (
                <>
                  {/* 聊天头部 */}
                  <div className="p-3 border-b flex items-center gap-3">
                    <Link href={`/profile/${selectedUser.id}`}>
                      <div className="flex items-center gap-2 hover:underline">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={selectedUser.name_color ? nameBgStyles[selectedUser.name_color] : "bg-gradient-to-br from-blue-500 to-purple-600"}>
                            {selectedUser.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`font-medium ${getPointsColor(selectedUser.points, selectedUser.role)}`}>
                          {selectedUser.username}
                        </span>
                      </div>
                    </Link>
                  </div>

                  {/* 消息列表 */}
                  <ScrollArea className="flex-1 p-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        发送第一条消息开始聊天
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => {
                          const isOwn = msg.sender_id === currentUser?.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] px-4 py-2 rounded-lg ${
                                  isOwn
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                  {formatDateTime(msg.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* 发送区域 */}
                  <div className="p-3 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="输入消息..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        disabled={sending}
                      />
                      <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  选择一个会话或搜索用户开始聊天
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
