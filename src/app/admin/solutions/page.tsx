"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Solution {
  id: number;
  problem_id: number;
  title: string;
  content: string;
  likes: number;
  status: string;
  user_id: number;
  created_at: string;
  users?: {
    id: number;
    username: string;
    role: string;
  };
  problems?: {
    id: number;
    title: string;
  };
}

interface User {
  id: number;
  username: string;
  role: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "待审核", color: "bg-yellow-500" },
  approved: { label: "已通过", color: "bg-green-500" },
  rejected: { label: "已拒绝", color: "bg-red-500" },
};

export default function SolutionReviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await fetch("/api/auth/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
          
          // 检查权限
          if (userData.user?.role !== "admin" && userData.user?.role !== "super_admin") {
            toast.error("没有权限访问此页面");
            router.push("/");
            return;
          }
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/login");
      }
    };
    fetchData();
  }, [router]);

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "super_admin")) {
      fetchSolutions(activeTab);
    }
  }, [user, activeTab]);

  const fetchSolutions = async (status: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/solutions?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setSolutions(data.solutions || []);
      }
    } catch (error) {
      console.error("Failed to fetch solutions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (solutionId: number, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/solutions/${solutionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchSolutions(activeTab);
        if (selectedSolution?.id === solutionId) {
          setSelectedSolution(null);
        }
      } else {
        toast.error(data.error || "操作失败");
      }
    } catch (error) {
      toast.error("操作失败");
    }
  };

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首页
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">题解审核管理</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending">待审核</TabsTrigger>
          <TabsTrigger value="approved">已通过</TabsTrigger>
          <TabsTrigger value="rejected">已拒绝</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 题解列表 */}
            <div className="space-y-4">
              {isLoading ? (
                <Card>
                  <CardContent className="py-12 text-center">加载中...</CardContent>
                </Card>
              ) : solutions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无{statusConfig[activeTab]?.label}的题解</p>
                  </CardContent>
                </Card>
              ) : (
                solutions.map((solution) => (
                  <Card
                    key={solution.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      selectedSolution?.id === solution.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedSolution(solution)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{solution.title}</h3>
                        <Badge className={`${statusConfig[solution.status]?.color} text-white`}>
                          {statusConfig[solution.status]?.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          题目ID: {solution.problem_id}
                        </span>
                        <span>
                          作者: {solution.users?.username || `用户${solution.user_id}`}
                        </span>
                        <span>
                          {new Date(solution.created_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* 题解详情 */}
            <Card className="h-fit sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>题解详情</span>
                  {selectedSolution && activeTab === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => handleReview(selectedSolution.id, "approved")}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        通过
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => handleReview(selectedSolution.id, "rejected")}
                      >
                        <X className="h-4 w-4 mr-1" />
                        拒绝
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSolution ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                      <span>题目ID: {selectedSolution.problem_id}</span>
                      <span>作者: {selectedSolution.users?.username || `用户${selectedSolution.user_id}`}</span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {selectedSolution.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>选择一个题解查看详情</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
