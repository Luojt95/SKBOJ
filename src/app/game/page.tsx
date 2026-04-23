"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gamepad2, 
  Grid3X3, 
  Layers, 
  Bird, 
  Puzzle, 
  Zap,
  Trophy,
  Clock,
  Star,
  ChevronRight
} from "lucide-react";

interface Game {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  difficulty: string;
  bestScore?: number;
}

const games: Game[] = [
  {
    id: "2048",
    name: "2048",
    description: "滑动合并数字，挑战2048！经典的益智游戏。",
    icon: <Grid3X3 className="h-12 w-12" />,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    difficulty: "入门",
  },
  {
    id: "snake",
    name: "贪吃蛇",
    description: "控制蛇吃食物越长越长，别撞到墙壁和自己！",
    icon: <Layers className="h-12 w-12" />,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    difficulty: "入门",
  },
  {
    id: "flappy",
    name: "Flappy Bird",
    description: "点击跳跃穿越障碍，挑战最高分！",
    icon: <Bird className="h-12 w-12" />,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    difficulty: "简单",
  },
  {
    id: "tetris",
    name: "俄罗斯方块",
    description: "经典俄罗斯方块，消行得分！",
    icon: <Puzzle className="h-12 w-12" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    difficulty: "入门",
  },
  {
    id: "memory",
    name: "记忆翻牌",
    description: "翻转卡片找配对，考验你的记忆力！",
    icon: <Zap className="h-12 w-12" />,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    difficulty: "简单",
  },
];

export default function GameCenterPage() {
  const [mounted, setMounted] = useState(false);
  const [userScores, setUserScores] = useState<Record<string, number>>({});

  useEffect(() => {
    setMounted(true);
    // 从本地存储加载最高分
    const savedScores = localStorage.getItem("skboj_game_scores");
    if (savedScores) {
      setUserScores(JSON.parse(savedScores));
    }
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "入门": return "bg-green-500/20 text-green-400";
      case "简单": return "bg-yellow-500/20 text-yellow-400";
      case "中等": return "bg-orange-500/20 text-orange-400";
      case "困难": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  if (!mounted) {
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
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Gamepad2 className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold">SKBOJ 游戏中心</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          编程之余，来放松一下吧！挑战各种经典游戏，争夺排行榜！
        </p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Gamepad2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{games.length}</p>
              <p className="text-sm text-muted-foreground">游戏数量</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Object.keys(userScores).length}</p>
              <p className="text-sm text-muted-foreground">已挑战</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Star className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Object.values(userScores).reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-sm text-muted-foreground">总得分</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Clock className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">休闲</p>
              <p className="text-sm text-muted-foreground">游戏模式</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 游戏列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <Link key={game.id} href={`/game/${game.id}`}>
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-4 rounded-xl ${game.bgColor}`}>
                    <span className={game.color}>{game.icon}</span>
                  </div>
                  <Badge className={getDifficultyColor(game.difficulty)}>
                    {game.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-xl mt-4">{game.name}</CardTitle>
                <CardDescription>{game.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {userScores[game.id] ? (
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">最高分:</span>
                      <span className="font-bold text-yellow-500">{userScores[game.id]}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">尚未挑战</span>
                  )}
                  <Button variant="ghost" size="sm" className="gap-1">
                    开始游戏
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 提示信息 */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
        <p>💡 提示：游戏进度会自动保存，最高分记录在本地存储中</p>
      </div>
    </div>
  );
}
