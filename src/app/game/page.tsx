"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Plus, ExternalLink, Trash2, Edit, Eye, EyeOff } from "lucide-react";

interface Game {
  id: number;
  name: string;
  description: string;
  thumbnail: string;
  is_visible: boolean;
  created_at: string;
}

export default function GameListPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: number; role: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 获取用户信息
      const userRes = await fetch("/api/auth/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
        setIsAdmin(userData.user?.role === "admin" || userData.user?.role === "super_admin");
      }

      // 获取游戏列表
      const params = new URLSearchParams();
      if (isAdmin) {
        params.set("is_admin", "true");
      }
      const gamesRes = await fetch(`/api/games?${params.toString()}`);
      const gamesData = await gamesRes.json();
      setGames(gamesData.games || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个游戏吗？")) return;

    try {
      const res = await fetch(`/api/games/${id}`, { method: "DELETE" });
      if (res.ok) {
        setGames(games.filter(g => g.id !== id));
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleToggleVisibility = async (id: number, currentVisible: boolean) => {
    try {
      const res = await fetch(`/api/games/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: !currentVisible }),
      });
      if (res.ok) {
        setGames(games.map(g => g.id === id ? { ...g, is_visible: !currentVisible } : g));
      }
    } catch (error) {
      console.error("Toggle visibility error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Gamepad2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">SKBOJ游戏中心</h1>
        </div>
        {isAdmin && (
          <Link href="/game/manage">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              添加游戏
            </Button>
          </Link>
        )}
      </div>

      {/* 游戏列表 */}
      {games.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">暂无游戏</p>
            {isAdmin && (
              <Link href="/game/manage">
                <Button className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  添加第一个游戏
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card key={game.id} className="overflow-hidden">
              {/* 缩略图 */}
              <div 
                className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
              >
                {game.thumbnail ? (
                  <img 
                    src={game.thumbnail} 
                    alt={game.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Gamepad2 className="h-16 w-16 text-muted-foreground/30" />
                )}
              </div>
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{game.name}</CardTitle>
                  {!game.is_visible && (
                    <Badge variant="secondary" className="text-xs">隐藏</Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-2">
                  {game.description || "暂无描述"}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between">
                  <Link href={`/game/${game.id}`}>
                    <Button className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      开始游戏
                    </Button>
                  </Link>
                  
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleToggleVisibility(game.id, game.is_visible)}
                        title={game.is_visible ? "设为隐藏" : "设为可见"}
                      >
                        {game.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Link href={`/game/manage?id=${game.id}`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(game.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
