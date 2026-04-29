"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2, X } from "lucide-react";

interface Game {
  id: number;
  name: string;
  description: string;
  html_code: string;
}

export default function GamePlayPage() {
  const params = useParams();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchGame();
    // 监听ESC键退出全屏
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        exitFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [params.id, isFullscreen]);

  const fetchGame = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/games/${params.id}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "游戏不存在");
        return;
      }
      
      // 检查是否有权限访问
      if (data.accessDenied) {
        setError(`需要 ${data.requiredRating} 以上Rating才能访问此游戏`);
        return;
      }
      
      setGame(data.game);
    } catch (error) {
      console.error("Fetch game error:", error);
      setError("加载游戏失败");
    } finally {
      setIsLoading(false);
    }
  };

  const enterFullscreen = () => {
    const elem = document.getElementById("game-container");
    if (elem?.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any)?.webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    }
    setIsFullscreen(true);
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if ((document as any).webkitFullscreenElement) {
      (document as any).webkitExitFullscreen();
    }
    setIsFullscreen(false);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4">{error || "游戏不存在"}</h1>
        <Link href="/game">
          <Button>返回游戏中心</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* 顶部导航 */}
      <div className="flex-none flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="flex items-center gap-4">
          <Link href="/game">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">{game.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={isFullscreen ? exitFullscreen : enterFullscreen}
            className="gap-2"
          >
            {isFullscreen ? (
              <>
                <X className="h-4 w-4" />
                退出全屏
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                全屏
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push("/game")}
          >
            返回列表
          </Button>
        </div>
      </div>

      {/* 游戏容器 - 占满整个剩余空间 */}
      <div className="flex-1 bg-black relative">
        <iframe
          srcDoc={game.html_code}
          className="absolute inset-0 w-full h-full border-0"
          title={game.name}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        />
      </div>

      {/* 操作提示 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 text-white text-sm rounded-full opacity-50 hover:opacity-100 transition-opacity z-20">
        按 ESC 退出全屏
      </div>
    </div>
  );
}
