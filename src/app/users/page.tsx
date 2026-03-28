"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Trophy, Code, User, UserX, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { nameColorConfig } from "@/lib/constants";
import { toast } from "sonner";

interface UserData {
  id: number;
  username: string;
  role: string;
  name_color: string;
  total_rating: number;
  solved_total: number;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  totalProblems: number;
  totalSubmissions: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProblems: 0,
    totalSubmissions: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    totalPages: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: number; role: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchUsers = async (page: number = 1) => {
    try {
      const [usersRes, meRes] = await Promise.all([
        fetch(`/api/users?page=${page}&pageSize=${pagination.pageSize}`),
        fetch("/api/auth/me"),
      ]);
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
        setStats({
          totalUsers: data.stats?.totalUsers || 0,
          totalProblems: data.stats?.totalProblems || 0,
          totalSubmissions: data.stats?.totalSubmissions || 0,
        });
        setPagination(data.pagination || { page: 1, pageSize: 50, totalPages: 1, total: 0 });
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Badge className="bg-red-500 text-white">站长</Badge>;
      case "admin":
        return <Badge className="bg-orange-500 text-white">管理员</Badge>;
      default:
        return <Badge variant="secondary">普通用户</Badge>;
    }
  };

  const getNameColor = (user: UserData) => {
    if (user.role === "admin" || user.role === "super_admin") {
      return "text-purple-500";
    }
    const colorConfig = nameColorConfig[user.name_color] || nameColorConfig.gray;
    return colorConfig.color;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN");
  };

  const handleSyncStats = async () => {
    if (!confirm("确定要同步所有用户的做题统计吗？")) return;
    
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-stats", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "同步成功");
        // 重新获取用户列表
        fetchUsers(pagination.page);
      } else {
        toast.error(data.error || "同步失败");
      }
    } catch {
      toast.error("同步失败，请重试");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("权限修改成功");
        // 更新本地用户列表
        setUsers(users.map(u => 
          u.id === userId ? { ...u, role: newRole, name_color: newRole === "admin" ? "purple" : u.name_color } : u
        ));
      } else {
        toast.error(data.error || "修改失败");
      }
    } catch {
      toast.error("修改失败，请重试");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("确定要注销该用户吗？此操作不可恢复！")) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("用户已注销");
        setUsers(users.filter(u => u.id !== userId));
      } else {
        toast.error(data.error || "注销失败");
      }
    } catch {
      toast.error("注销失败，请重试");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">用户列表</h1>
          <p className="text-muted-foreground mt-1">查看平台用户和统计数据</p>
        </div>
        {currentUser?.role === "admin" || currentUser?.role === "super_admin" ? (
          <Button
            variant="outline"
            onClick={handleSyncStats}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "同步中..." : "同步做题数"}
          </Button>
        ) : null}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">注册用户</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">题目总数</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProblems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">提交总数</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
          </CardContent>
        </Card>
      </div>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无用户</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>做题数</TableHead>
                  <TableHead>权限</TableHead>
                  <TableHead>注册时间</TableHead>
                  {currentUser?.role === "super_admin" && <TableHead className="w-20">操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono">{(pagination.page - 1) * pagination.pageSize + index + 1}</TableCell>
                    <TableCell>
                      <Link href={`/profile/${user.id}`}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                              {user.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className={`font-medium ${getNameColor(user)}`}>
                            {user.username}
                          </span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${getNameColor(user)}`}>
                        {user.total_rating || 100}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{user.solved_total || 0}</span>
                    </TableCell>
                    <TableCell>
                      {currentUser?.role === "super_admin" && currentUser.id !== user.id ? (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">
                              <Badge variant="secondary" className="text-xs">普通用户</Badge>
                            </SelectItem>
                            <SelectItem value="admin">
                              <Badge className="bg-orange-500 text-white text-xs">管理员</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getRoleBadge(user.role)
                      )}
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    {currentUser?.role === "super_admin" && (
                      <TableCell>
                        {currentUser.id !== user.id && user.role !== "super_admin" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            注销
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                共 {pagination.total} 名用户，第 {pagination.page} / {pagination.totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一页
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? "default" : "outline"}
                        size="sm"
                        className="w-9 h-9 p-0"
                        onClick={() => fetchUsers(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  下一页
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
