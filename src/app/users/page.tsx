"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, Trophy, Code, User, UserX, RefreshCw, ChevronLeft, ChevronRight, Trash2, Check, Square, Ban } from "lucide-react";
import { DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { getUserNameColorByRatingAndRole, getRatingConfig } from "@/lib/rating";

interface UserData {
  id: number;
  username: string;
  role: string;
  rating?: number;
  points: number;
  solved_total: number;
  created_at: string;
  is_banned?: boolean;
  avatar?: string;
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

// 根据Rating获取等级名
function getPointsTitle(points: number, role: string): string {
  if (role === "super_admin") return "站长";
  if (role === "admin") return "管理员";
  
  const p = points || 0;
  
  if (p <= 0) return "新手";
  if (p <= 10) return "入门";
  if (p <= 20) return "初级";
  if (p <= 50) return "中级";
  if (p <= 100) return "高级";
  if (p <= 200) return "专家";
  if (p <= 500) return "大师";
  return "传奇";
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

  // 批量选择状态
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // 禁言对话框状态
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banUser, setBanUser] = useState<UserData | null>(null);
  const [banReason, setBanReason] = useState("");
  const [isBanning, setIsBanning] = useState(false);

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
        setUsers(users.map(u => 
          u.id === userId ? { ...u, role: newRole } : u
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

  // 禁言用户
  const handleBanUser = async () => {
    if (!banUser || !banReason.trim()) {
      toast.error("请输入禁言原因");
      return;
    }

    setIsBanning(true);
    try {
      const res = await fetch(`/api/users/${banUser.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: banReason.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`已禁言用户 ${banUser.username}`);
        setBanDialogOpen(false);
        setBanReason("");
        fetchUsers(pagination.page);
      } else {
        toast.error(data.error || "禁言失败");
      }
    } catch {
      toast.error("禁言失败，请重试");
    } finally {
      setIsBanning(false);
    }
  };

  // 解禁用户
  const handleUnbanUser = async (userId: number, username: string) => {
    if (!confirm(`确定要解禁用户 ${username} 吗？`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}/ban`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`已解禁用户 ${username}`);
        fetchUsers(pagination.page);
      } else {
        toast.error(data.error || "解禁失败");
      }
    } catch {
      toast.error("解禁失败，请重试");
    }
  };

  // 处理复选框变化
  const handleCheckboxChange = (userId: number, checked: boolean) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 只能选择自己能删除的用户（不是站长，不是自己）
      const deletableUsers = users.filter(
        u => u.role !== "super_admin" && u.id !== currentUser?.id
      );
      setSelectedUserIds(new Set(deletableUsers.map(u => u.id)));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  // 批量删除用户
  const handleBatchDelete = async () => {
    if (selectedUserIds.size === 0) {
      toast.error("请先选择要删除的用户");
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedUserIds.size} 个用户吗？此操作不可恢复！`)) {
      return;
    }

    setIsDeleting(true);
    try {
      // 逐个删除
      const deletePromises = Array.from(selectedUserIds).map(userId =>
        fetch(`/api/users/${userId}`, { method: "DELETE" })
      );

      const results = await Promise.allSettled(deletePromises);
      let successCount = 0;
      let failCount = 0;

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const res = result.value;
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      });

      if (failCount === 0) {
        toast.success(`成功删除 ${successCount} 个用户`);
      } else {
        toast.error(`删除完成：成功 ${successCount} 个，失败 ${failCount} 个`);
      }

      // 刷新列表
      fetchUsers(pagination.page);
      setSelectedUserIds(new Set());
    } catch {
      toast.error("批量删除失败，请重试");
    } finally {
      setIsDeleting(false);
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
          <div className="flex gap-2">
            {selectedUserIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "删除中..." : `批量删除 (${selectedUserIds.size})`}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleSyncStats}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "同步中..." : "同步做题数"}
            </Button>
          </div>
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
                  {currentUser?.role === "super_admin" && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          users.length > 0 &&
                          users.filter(u => u.role !== "super_admin" && u.id !== currentUser?.id).length === selectedUserIds.size
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>做题数</TableHead>
                  <TableHead>权限</TableHead>
                  <TableHead>注册时间</TableHead>
                  {currentUser?.role === "super_admin" && <TableHead className="w-24">操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50">
                    {currentUser?.role === "super_admin" && (
                      <TableCell>
                        <Checkbox
                          checked={selectedUserIds.has(user.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(user.id, checked as boolean)}
                          disabled={user.role === "super_admin" || user.id === currentUser?.id}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono">{(pagination.page - 1) * pagination.pageSize + index + 1}</TableCell>
                    <TableCell>
                      <Link href={`/profile/${user.id}`}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={user.username} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                              {user.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className={`font-medium ${getUserNameColorByRatingAndRole(user.rating, user.role)}`}>
                              {user.username}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${getRatingConfig(user.rating || 0).textClass}`}>
                        {user.rating || 0}
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
                        <div className="flex gap-1">
                          {currentUser.id !== user.id && user.role !== "super_admin" && (
                            <>
                              <Button
                                variant={user.is_banned ? "outline" : "secondary"}
                                size="sm"
                                onClick={() => user.is_banned ? handleUnbanUser(user.id, user.username) : (setBanUser(user), setBanDialogOpen(true))}
                                title={user.is_banned ? "解禁用户" : "禁言用户"}
                              >
                                <Ban className={`h-4 w-4 ${user.is_banned ? "text-green-500" : "text-orange-500"}`} />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                title="注销用户"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
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

      {/* 禁言对话框 */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-orange-500" />
              禁言用户
            </DialogTitle>
            <DialogDescription>
              禁言后该用户的权限将降级为普通用户，且无法发犇犇、私信、讨论、分享和提交工单。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">用户：</span>
              <span className="text-lg">{banUser?.username}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="banReason">禁言原因 *</Label>
              <Input
                id="banReason"
                placeholder="请输入禁言原因（将告知用户）"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                请输入禁言原因，这将显示给用户
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleBanUser} disabled={isBanning || !banReason.trim()}>
              {isBanning ? "处理中..." : "确认禁言"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
