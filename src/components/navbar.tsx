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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import {
    Menu,
    X,
    Code,
    Trophy,
    Users,
    Bug,
    MessageSquare,
    Share2,
    Ticket,
    Home,
    Bell,
    Mail,
    HelpCircle,
    Clock,
    ClipboardList,
} from "lucide-react";

import { useLogoutCooldown } from "@/hooks/use-logout-cooldown";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getUserNameColorByRatingAndRole, getRatingConfig } from "@/lib/rating";

interface User {
    id: number;
    username: string;
    role: string;
    points?: number;
    avatar?: string;
    rating?: number;
}

const navItems = [{
    href: "/",
    label: "首页",
    icon: Home
}, {
    href: "/problems",
    label: "题目",
    icon: Code
}, {
    href: "/contests",
    label: "比赛",
    icon: Trophy
}, {
    href: "/users",
    label: "用户",
    icon: Users
}, {
    href: "/debug",
    label: "Debug",
    icon: Bug
}, {
    href: "/discussions",
    label: "讨论",
    icon: MessageSquare
}, {
    href: "/shares",
    label: "分享",
    icon: Share2
}, {
    href: "/tickets",
    label: "工单",
    icon: Ticket
}, {
    href: "/survey",
    label: "问卷",
    icon: ClipboardList
}, {
    href: "/help",
    label: "帮助中心",
    icon: HelpCircle
}];

export function Navbar() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [canShowRegister, setCanShowRegister] = useState(false);

    const {
        canLogout,
        formattedTime,
        refresh: refreshCooldown
    } = useLogoutCooldown();

    const refreshUser = async () => {
        try {
            const res = await fetch("/api/auth/me");

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);

                if (data.user?.lastLogin) {
                    localStorage.setItem("lastLogin", data.user.lastLogin);
                }

                refreshCooldown();
            }
        } catch {
            setUser(null);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    useEffect(() => {
        refreshCooldown();
    }, [user, refreshCooldown]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            if (user?.role === "super_admin") {
                localStorage.setItem("currentUserRole", "super_admin");
            } else {
                localStorage.removeItem("currentUserRole");
            }
        }
    }, [user]);

    useEffect(() => {
        const checkCanShowRegister = () => {
            if (typeof window !== "undefined") {
                const lastLogin = localStorage.getItem("lastLogin");

                if (lastLogin) {
                    const loginTime = new Date(lastLogin).getTime();
                    const now = Date.now();
                    const elapsed = now - loginTime;
                    const COOLDOWN_MS = 10 * 60 * 1000;

                    if (elapsed < COOLDOWN_MS) {
                        setCanShowRegister(false);
                        return;
                    }
                }

                setCanShowRegister(true);
            }
        };

        checkCanShowRegister();
    }, [user]);

    useEffect(() => {
        if (!user)
            return;

        const fetchUnreadCounts = async () => {
            try {
                const notifRes = await fetch("/api/notifications?unread=true&limit=0");

                if (notifRes.ok) {
                    const data = await notifRes.json();
                    setUnreadNotifications(data.unreadCount || 0);
                }

                const msgRes = await fetch("/api/messages");

                if (msgRes.ok) {
                    const data = await msgRes.json();

                    const totalUnread = (data.conversations || []).reduce((
                        sum: number,
                        conv: {
                            unreadCount: number;
                        }
                    ) => sum + conv.unreadCount, 0);

                    setUnreadMessages(totalUnread);
                }
            } catch (error) {
                console.error("Failed to fetch unread counts:", error);
            }
        };

        fetchUnreadCounts();
        const interval = setInterval(fetchUnreadCounts, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const handleLogout = async () => {
        if (typeof window !== "undefined") {
            const currentUserRole = localStorage.getItem("currentUserRole");

            if (currentUserRole === "super_admin") {
                localStorage.setItem("previousUserRole", "super_admin");
            } else {
                localStorage.removeItem("previousUserRole");
            }
        }

        await fetch("/api/auth/logout", {
            method: "POST"
        });

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

    const userColorStyle = getUserNameColorByRatingAndRole(user?.rating, user?.role);
    const canRegister = user?.role === "super_admin";

    return (
        <nav
            className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {}
                    <Link href="/" className="flex items-center space-x-2">
                        <div
                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                                <path
                                    d="M12 4C6 4 2 9 2 12s4 8 10 8c1 0 2-.5 2-.5 3 2 6 1 6 1s-2-2-2-4c0 0 4-2 4-4.5S16 4 12 4zM7 11c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                            </svg>
                        </div>
                        <span className="font-bold text-xl hidden sm:inline-block">SKBOJ</span>
                    </Link>
                    {}
                    <div className="hidden md:flex items-center space-x-1">
                        {navItems.map(item => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                    style={{
                                        borderRadius: "15px"
                                    }}>
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                    {}
                    <div className="hidden md:flex items-center space-x-2">
                        {user ? <>
                            {}
                            <Link href="/notifications">
                                <Button variant="ghost" size="icon" className="relative">
                                    <Bell className="h-5 w-5" />
                                    {unreadNotifications > 0 && <Badge
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                                    </Badge>}
                                </Button>
                            </Link>
                            {}
                            <Link href="/messages">
                                <Button variant="ghost" size="icon" className="relative">
                                    <Mail className="h-5 w-5" />
                                    {unreadMessages > 0 && <Badge
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                                        {unreadMessages > 99 ? "99+" : unreadMessages}
                                    </Badge>}
                                </Button>
                            </Link>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="flex items-center space-x-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.avatar} alt={user.username} />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                                {user.username[0].toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className={`font-medium ${userColorStyle}`}>{user.username}</span>
                                        {user.rating !== undefined && user.rating !== null && <Badge
                                            variant="outline"
                                            className="ml-1 text-xs font-mono"
                                            style={{
                                                borderColor: getRatingConfig(user.rating).color,
                                                color: getRatingConfig(user.rating).color
                                            }}>
                                            {user.rating ?? 0}
                                        </Badge>}
                                        {getRoleBadge(user.role)}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem asChild>
                                        <Link href={`/profile/${user.id}`}>个人中心</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/settings">个人设置</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {canLogout ? <DropdownMenuItem onClick={handleLogout} className="text-red-600">退出登录
                                                              </DropdownMenuItem> : <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground cursor-not-allowed">
                                                    <Clock className="h-4 w-4" />
                                                    <span className="text-sm">退出登录 ({formattedTime})</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>登录后需等待10分钟方可退出</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>}
                                    <DropdownMenuItem onClick={() => window.location.href = "/login"} className="text-blue-600">登录其他账号
                                                            </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </> : <>
                            <Button variant="ghost" asChild>
                                <Link href="/login">登录</Link>
                            </Button>
                            {canShowRegister && <Button asChild>
                                <Link href="/register">注册</Link>
                            </Button>}
                        </>}
                    </div>
                    {}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </div>
                {}
                {isMenuOpen && <div className="md:hidden py-4 border-t">
                    <div className="flex flex-col space-y-2">
                        {navItems.map(item => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={cn(
                                        "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}>
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                        <div className="flex flex-col space-y-2 pt-2 border-t">
                            {user ? <>
                                <div className="flex items-center justify-between px-3 py-2">
                                    <div className="flex items-center space-x-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.avatar} alt={user.username} />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                                {user.username[0].toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className={`font-medium ${userColorStyle}`}>{user.username}</span>
                                        {getRoleBadge(user.role)}
                                    </div>
                                </div>
                                <Button variant="ghost" asChild className="justify-start">
                                    <Link href="/notifications" onClick={() => setIsMenuOpen(false)}>
                                        <Bell className="h-4 w-4 mr-2" />通知
                                                                {unreadNotifications > 0 && <Badge variant="destructive" className="ml-2">
                                            {unreadNotifications}
                                        </Badge>}
                                    </Link>
                                </Button>
                                <Button variant="ghost" asChild className="justify-start">
                                    <Link href="/messages" onClick={() => setIsMenuOpen(false)}>
                                        <Mail className="h-4 w-4 mr-2" />私信
                                                                {unreadMessages > 0 && <Badge variant="destructive" className="ml-2">
                                            {unreadMessages}
                                        </Badge>}
                                    </Link>
                                </Button>
                                <Button variant="ghost" asChild className="justify-start">
                                    <Link href={`/profile/${user.id}`} onClick={() => setIsMenuOpen(false)}>个人中心
                                                              </Link>
                                </Button>
                                <Button variant="ghost" asChild className="justify-start">
                                    <Link href="/settings" onClick={() => setIsMenuOpen(false)}>个人设置
                                                              </Link>
                                </Button>
                                {canLogout ? <Button
                                    variant="ghost"
                                    onClick={() => {
                                        handleLogout();
                                        setIsMenuOpen(false);
                                    }}
                                    className="justify-start text-red-600">退出登录
                                                          </Button> : <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-sm">退出登录 ({formattedTime})</span>
                                    <span className="text-xs text-muted-foreground/60">登录后需等待10分钟</span>
                                </div>}
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        window.location.href = "/login";
                                        setIsMenuOpen(false);
                                    }}
                                    className="justify-start text-blue-600">登录其他账号
                                                        </Button>
                            </> : <>
                                <Button variant="ghost" asChild className="justify-start">
                                    <Link href="/login">登录</Link>
                                </Button>
                                {canShowRegister && <Button asChild className="justify-start">
                                    <Link href="/register">注册</Link>
                                </Button>}
                            </>}
                        </div>
                    </div>
                </div>}
            </div>
        </nav>
    );
}