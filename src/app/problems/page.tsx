"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Code, MinusCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { difficultyConfig, categoryConfig } from "@/lib/constants";

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  category: string;
  category_index: number | null;
  tags: string[];
  author_id: number;
  is_visible: boolean;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

interface ProblemStatus {
  status: string;
  bestScore: number;
}

const statusConfig: Record<string, { label: string; bgClass: string }> = {
  ac: { label: "AC", bgClass: "bg-green-500 text-white" },
  wa: { label: "WA", bgClass: "bg-red-500 text-white" },
  tle: { label: "TLE", bgClass: "bg-yellow-500 text-white" },
  mle: { label: "MLE", bgClass: "bg-orange-500 text-white" },
  re: { label: "RE", bgClass: "bg-purple-500 text-white" },
  ce: { label: "CE", bgClass: "bg-gray-500 text-white" },
  pac: { label: "UAC", bgClass: "bg-red-500 text-white" },
};

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [problemStatus, setProblemStatus] = useState<Record<number, ProblemStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取当前用户
        const userRes = await fetch("/api/auth/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);

          // 获取用户提交状态
          if (userData.user) {
            const statusRes = await fetch("/api/submissions/status");
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              setProblemStatus(statusData.status || {});
            }
          }
        }

        // 获取题目列表
        const problemsRes = await fetch("/api/problems");
        const problemsData = await problemsRes.json();
        setProblems(problemsData.problems || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = problem.title.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficulty === "all" || problem.difficulty === difficulty;
    const matchesCategory = category === "all" || problem.category === category;
    return matchesSearch && matchesDifficulty && matchesCategory;
  });

  const canCreateProblem = user && (user.role === "admin" || user.role === "super_admin");

  // 整理题号 - 按题库分类重新编号
  const handleReorderProblems = async () => {
    if (!confirm("确定要整理题号吗？此操作将按题库分类重新分配题目编号（如P0001, P0002...）。")) {
      return;
    }

    setIsReordering(true);
    try {
      const res = await fetch("/api/problems/reorder", {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`整理完成，共整理了 ${data.updatedCount} 道题目`);
        // 刷新页面
        window.location.reload();
      } else {
        toast.error(data.error || "整理失败");
      }
    } catch (error) {
      toast.error("整理失败");
    } finally {
      setIsReordering(false);
    }
  };

  // 根据题库和题目序号生成题目编号
  const getProblemNumber = (problem: Problem) => {
    const prefix = problem.category || "P";
    const index = problem.category_index || problem.id;
    return `${prefix}${String(index).padStart(4, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">题目列表</h1>
          <p className="text-muted-foreground mt-1">共 {filteredProblems.length} 道题目</p>
        </div>
        {canCreateProblem && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReorderProblems}
              disabled={isReordering}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isReordering ? "animate-spin" : ""}`} />
              整理题号
            </Button>
            <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Link href="/problems/create">
                <Plus className="h-4 w-4 mr-2" />
                创建题目
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索题目..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="题库" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部题库</SelectItem>
                <SelectItem value="P">P题库</SelectItem>
                <SelectItem value="B">B题库</SelectItem>
                <SelectItem value="M">M题库</SelectItem>
                <SelectItem value="F">F题库</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="难度筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部难度</SelectItem>
                <SelectItem value="entry">入门</SelectItem>
                <SelectItem value="popular_minus">普及-</SelectItem>
                <SelectItem value="popular">普及/提高-</SelectItem>
                <SelectItem value="popular_plus">普及+/提高</SelectItem>
                <SelectItem value="improve_plus">提高+/省选-</SelectItem>
                <SelectItem value="provincial">省选/NOI-</SelectItem>
                <SelectItem value="noi">NOI/NOI+/CTSC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 题目列表 */}
      <div className="space-y-4">
        {filteredProblems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无题目</p>
            </CardContent>
          </Card>
        ) : (
          filteredProblems.map((problem) => {
            const diffConfig = difficultyConfig[problem.difficulty] || difficultyConfig.unknown;
            const catConfig = categoryConfig[problem.category] || categoryConfig.P;
            const status = problemStatus[problem.id];
            const statusInfo = status ? statusConfig[status.status] : null;

            return (
              <Link key={problem.id} href={`/problems/${problem.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* 状态标签 */}
                        <div className="w-12 flex justify-center">
                          {statusInfo ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusInfo.bgClass}`}>
                              {statusInfo.label}
                            </span>
                          ) : (
                            <MinusCircle className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
                        <span className={`text-lg font-mono w-20 ${catConfig.color}`}>
                          {getProblemNumber(problem)}
                        </span>
                        <div>
                          <h3 className="font-semibold text-lg">{problem.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`${diffConfig.bg} text-white text-xs`}>
                              {diffConfig.label}
                            </Badge>
                            {problem.tags?.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {status && (
                          <span className="text-sm text-blue-500 font-medium">{status.bestScore}分</span>
                        )}
                        {!problem.is_visible && (
                          <Badge variant="secondary">隐藏</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
