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
import { Search, Plus, Code } from "lucide-react";
import { difficultyConfig, categoryConfig } from "@/lib/constants";

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  category: string;
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

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取当前用户
        const userRes = await fetch("/api/auth/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
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

  // 根据题库生成题目编号
  const getProblemNumber = (problem: Problem) => {
    const prefix = problem.category || "P";
    return `${prefix}${String(problem.id).padStart(4, '0')}`;
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
          <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Link href="/problems/create">
              <Plus className="h-4 w-4 mr-2" />
              创建题目
            </Link>
          </Button>
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
            return (
              <Link key={problem.id} href={`/problems/${problem.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
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
                      {!problem.is_visible && (
                        <Badge variant="secondary">隐藏</Badge>
                      )}
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
