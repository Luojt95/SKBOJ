"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Code, Trophy, Users, Bug, MessageSquare, Share2, Ticket, Home, Bell, Mail, Coins } from "lucide-react";

interface User {
  id: number;
  username: string;
  role: string;
  points?: number;
}

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/problems", label: "题目", icon: Code },
  { href: "/contests", label: "比赛", icon: Trophy },
  { href: "/users", label: "用户", icon: Users },
  { href: "/debug", label: "Debug", icon: Bug },
  { href: "/discussions", label: "讨论", icon: MessageSquare },
  { href: "/shares", label: "分享", icon: Share2 },
  { href: "/tickets", label: "工单", icon: Ticket },
];

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

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

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

  // 获取未读消息数量
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCounts = async () => {
      try {
        // 获取通知未读数
        const notifRes = await fetch("/api/notifications?unread=true&limit=0");
        if (notifRes.ok) {
          const data = await notifRes.json();
          setUnreadNotifications(data.unreadCount || 0);
        }

        // 获取私信未读数（简化处理，通过会话列表获取）
        const msgRes = await fetch("/api/messages");
        if (msgRes.ok) {
          const data = await msgRes.json();
          const totalUnread = (data.conversations || []).reduce(
            (sum: number, conv: { unreadCount: number }) => sum + conv.unreadCount,
            0
          );
          setUnreadMessages(totalUnread);
        }
      } catch (error) {
        console.error("Failed to fetch unread counts:", error);
      }
    };

    fetchUnreadCounts();
    // 每30秒刷新一次
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded">站长</span>;
      case "admin":
        return <span className="ml-2 px-2 py-0.5 text-xs bg-orange-500 text-white rounded">管理员</span>;
      default:
        return null;
    }
  };

  const userColorStyle = getPointsColor(user?.points, user?.role);
  const isSuperAdmin = user?.role === "super_admin";
  const displayPoints = isSuperAdmin ? "∞" : (user?.points ?? 100);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                <path d="M12 4C6 4 2 9 2 12s4 8 10 8c1 0 2-.5 2-.5 3 2 6 1 6 1s-2-2-2-4c0 0 4-2 4-4.5S16 4 12 4zM7 11c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
              </svg>
            </div>
            <span className="font-bold text-xl hidden sm:inline-block">SKBOJ</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <>
                {/* 积分显示 */}
                <Link href="/profile/${user.id}">
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                    <Coins className="h-4 w-4" />
                    <span className="font-medium text-sm">{displayPoints}</span>
                  </div>
                </Link>

                {/* 通知按钮 */}
                <Link href="/notifications">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                      </Badge>
                    )}
                  </Button>
                </Link>

                {/* 私信按钮 */}
                <Link href="/messages">
                  <Button variant="ghost" size="icon" className="relative">
                    <Mail className="h-5 w-5" />
                    {unreadMessages > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </Badge>
                    )}
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {user.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`font-medium ${userColorStyle}`}>{user.username}</span>
                      {getRoleBadge(user.role)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${user.id}`}>个人中心</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">登录</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">注册</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="flex flex-col space-y-2 pt-2 border-t">
                {user ? (
                  <>
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {user.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`font-medium ${userColorStyle}`}>{user.username}</span>
                        {getRoleBadge(user.role)}
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        <Coins className="h-3 w-3" />
                        <span className="font-medium text-xs">{displayPoints}</span>
                      </div>
                    </div>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href="/notifications" onClick={() => setIsMenuOpen(false)}>
                        <Bell className="h-4 w-4 mr-2" />
                        通知
                        {unreadNotifications > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {unreadNotifications}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href="/messages" onClick={() => setIsMenuOpen(false)}>
                        <Mail className="h-4 w-4 mr-2" />
                        私信
                        {unreadMessages > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {unreadMessages}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href={`/profile/${user.id}`} onClick={() => setIsMenuOpen(false)}>
                        个人中心
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="justify-start text-red-600"
                    >
                      退出登录
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href="/login">登录</Link>
                    </Button>
                    <Button asChild className="justify-start">
                      <Link href="/register">注册</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
