"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Game {
  id?: number;
  name: string;
  description: string;
  html_code: string;
  thumbnail: string;
  is_visible: boolean;
  category: string;
}

function GameManageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [formData, setFormData] = useState<Game>({
    name: "",
    description: "",
    html_code: "",
    thumbnail: "",
    is_visible: true,
    category: "FREE",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!!editId);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (editId) {
      fetchGame(parseInt(editId));
    }
  }, [editId]);

  const checkAdmin = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user?.role !== "admin" && data.user?.role !== "super_admin") {
          toast.error("没有权限访问此页面");
          router.push("/game");
        }
        setIsAdmin(true);
      } else {
        toast.error("请先登录");
        router.push("/login");
      }
    } catch (error) {
      console.error("Check admin error:", error);
    }
  };

  const fetchGame = async (id: number) => {
    try {
      setIsFetching(true);
      const res = await fetch(`/api/games/${id}`);
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "获取游戏失败");
        router.push("/game/manage");
        return;
      }
      
      setFormData({
        id: data.game.id,
        name: data.game.name,
        description: data.game.description || "",
        html_code: data.game.html_code,
        thumbnail: data.game.thumbnail || "",
        is_visible: data.game.is_visible,
        category: data.game.category || "FREE",
      });
    } catch (error) {
      console.error("Fetch game error:", error);
      toast.error("加载游戏失败");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("请输入游戏名称");
      return;
    }
    
    if (!formData.html_code.trim()) {
      toast.error("请输入游戏代码");
      return;
    }

    setIsLoading(true);

    try {
      const url = editId ? `/api/games/${editId}` : "/api/games";
      const method = editId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "保存失败");
        return;
      }
      
      toast.success(editId ? "游戏更新成功" : "游戏创建成功");
      router.push("/game");
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("保存失败");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/game">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{editId ? "编辑游戏" : "添加游戏"}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>设置游戏的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">游戏名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：2048"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">游戏描述</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述游戏玩法"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="thumbnail">缩略图URL</Label>
                <Input
                  id="thumbnail"
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  placeholder="https://example.com/image.png"
                />
              </div>

              {/* 类别选择 */}
              <div className="space-y-2">
                <Label htmlFor="category">游戏类别</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="FREE">FREE - 登录即可访问</option>
                  <option value="D">D类 - Rating &gt;= 200</option>
                  <option value="C">C类 - Rating &gt;= 500</option>
                  <option value="B">B类 - Rating &gt;= 800</option>
                  <option value="A">A类 - Rating &gt;= 1200</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  根据玩家 Rating 限制访问权限
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="is_visible"
                  checked={formData.is_visible}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
                />
                <Label htmlFor="is_visible" className="flex items-center gap-2 cursor-pointer">
                  {formData.is_visible ? (
                    <><Eye className="h-4 w-4" /> 公开</>
                  ) : (
                    <><EyeOff className="h-4 w-4" /> 隐藏</>
                  )}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* 游戏代码 */}
          <Card>
            <CardHeader>
              <CardTitle>游戏代码 *</CardTitle>
              <CardDescription>
                粘贴游戏的完整 HTML 代码（包括 &lt;html&gt;、&lt;head&gt;、&lt;body&gt; 标签）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.html_code}
                onChange={(e) => setFormData({ ...formData, html_code: e.target.value })}
                placeholder={`<!DOCTYPE html>
<html>
<head>
  <title>游戏名称</title>
  <style>
    /* 游戏样式 */
  </style>
</head>
<body>
  <!-- 游戏内容 -->
  <script>
    // 游戏逻辑
  </script>
</body>
</html>`}
                className="w-full h-96 p-4 font-mono text-sm bg-muted rounded-lg border resize-y"
              />
            </CardContent>
          </Card>

          {/* 提交按钮 */}
          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading} className="gap-2">
              <Save className="h-4 w-4" />
              {isLoading ? "保存中..." : "保存"}
            </Button>
            <Link href="/game">
              <Button type="button" variant="outline">取消</Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function GameManagePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      </div>
    }>
      <GameManageContent />
    </Suspense>
  );
}
