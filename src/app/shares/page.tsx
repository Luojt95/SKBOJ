"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Share2, Eye, Copy, Code, Plus, Play } from "lucide-react";

interface CodeShare {
  id: number;
  title: string;
  code: string;
  language: string;
  author_id: number;
  description: string;
  views: number;
  created_at: string;
  users?: { username: string };
}

interface User {
  id: number;
  username: string;
  role: string;
}

const languageColors: Record<string, string> = {
  cpp: "bg-blue-500",
  python: "bg-green-500",
  html: "bg-orange-500",
};

export default function SharesPage() {
  const router = useRouter();
  const [shares, setShares] = useState<CodeShare[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedShare, setSelectedShare] = useState<CodeShare | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sharesRes, userRes] = await Promise.all([
          fetch("/api/shares"),
          fetch("/api/auth/me"),
        ]);

        if (sharesRes.ok) {
          const data = await sharesRes.json();
          setShares(data.shares || []);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredShares = shares.filter(
    (s) => selectedLanguage === "all" || s.language === selectedLanguage
  );

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("代码已复制到剪贴板");
  };

  const handleDebug = (share: CodeShare) => {
    // 存储代码到 localStorage，跳转到 debug 页面
    localStorage.setItem("debug_code", share.code);
    localStorage.setItem("debug_language", share.language);
    router.push("/debug");
  };

  const handleCreateShare = () => {
    if (!user) {
      toast.error("请先登录");
      router.push("/login");
      return;
    }
    router.push("/shares/create");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">代码分享</h1>
          <p className="text-muted-foreground mt-1">浏览和学习他人分享的代码</p>
        </div>
        <Button onClick={handleCreateShare} className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Plus className="h-4 w-4 mr-2" />
            新建分享代码
          </Button>
      </div>

      {/* 语言筛选 */}
      <Tabs value={selectedLanguage} onValueChange={setSelectedLanguage} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="cpp">C++</TabsTrigger>
          <TabsTrigger value="python">Python</TabsTrigger>
          <TabsTrigger value="html">HTML</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 分享列表 */}
        <div className="space-y-4">
          {filteredShares.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无分享</p>
              </CardContent>
            </Card>
          ) : (
            filteredShares.map((share) => (
              <Card
                key={share.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  selectedShare?.id === share.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedShare(share)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{share.title}</h3>
                        <Badge
                          className={`${languageColors[share.language]} text-white text-xs`}
                        >
                          {share.language.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {share.description || "暂无描述"}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          {(share as any).users ? (
                            <Link 
                              href={`/profile/${(share as any).users.id}`}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            >
                              {(share as any).users.username}
                            </Link>
                          ) : (
                            `用户${share.author_id}`
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {share.views}
                        </span>
                        <span>{formatDate(share.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 代码预览 */}
        <Card className="h-fit sticky top-20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {selectedShare ? selectedShare.title : "代码预览"}
              </CardTitle>
              {selectedShare && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(selectedShare.code)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDebug(selectedShare)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    调试
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedShare ? (
              <pre className="bg-muted p-4 rounded-lg font-mono text-sm overflow-auto max-h-[500px] whitespace-pre-wrap">
                {selectedShare.code}
              </pre>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>选择一个分享查看代码</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
