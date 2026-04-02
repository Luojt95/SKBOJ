"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Play, Send, BookOpen, Edit, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { difficultyConfig, categoryConfig } from "@/lib/constants";

interface Problem {
  id: number;
  title: string;
  description: string;
  input_format: string;
  output_format: string;
  samples: Array<{ input: string; output: string }>;
  hint: string;
  difficulty: string;
  category: string;
  time_limit: number;
  memory_limit: number;
  tags: string[];
  author_id: number;
  author?: { id: number; username: string; role: string };
  is_visible: boolean;
}

interface User {
  id: number;
  username: string;
  role: string;
}

interface Submission {
  id: number;
  user_id: number;
  problem_id: number;
  language: string;
  status: string;
  score: number;
  time_used: number;
  memory_used: number;
  test_results: string;
  created_at: string;
  users: {
    id: number;
    username: string;
    role: string;
  };
}

interface Solution {
  id: number;
  problem_id: number;
  title: string;
  content: string;
  likes: number;
  created_at: string;
  users: {
    id: number;
    username: string;
    role: string;
  };
}

const defaultCodes: Record<string, string> = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    // 你的代码
    
    return 0;
}`,
  python: `# 你的代码
def main():
    pass

if __name__ == "__main__":
    main()`,
  html: `<!DOCTYPE html>
<html>
<head>
    <title>My Page</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>`,
};

const statusConfig: Record<string, { label: string; bgClass: string }> = {
  ac: { label: "AC", bgClass: "bg-green-500 text-white" },
  wa: { label: "WA", bgClass: "bg-red-500 text-white" },
  tle: { label: "TLE", bgClass: "bg-yellow-500 text-white" },
  mle: { label: "MLE", bgClass: "bg-orange-500 text-white" },
  re: { label: "RE", bgClass: "bg-purple-500 text-white" },
  ce: { label: "CE", bgClass: "bg-gray-500 text-white" },
  pac: { label: "UAC", bgClass: "bg-red-500 text-white" },
};

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contestId = searchParams.get("contest");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [likedSolutions, setLikedSolutions] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(defaultCodes.cpp);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [problemRes, userRes, submissionsRes, solutionsRes] = await Promise.all([
          fetch(`/api/problems/${params.id}`),
          fetch("/api/auth/me"),
          fetch(`/api/submissions/problem/${params.id}`),
          fetch(`/api/solutions?problem_id=${params.id}`),
        ]);

        if (problemRes.ok) {
          const data = await problemRes.json();
          setProblem(data.problem);
          // 设置默认输入
          if (data.problem?.samples?.[0]?.input) {
            setInput(data.problem.samples[0].input);
          }
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
        }

        if (submissionsRes.ok) {
          const submissionsData = await submissionsRes.json();
          setSubmissions(submissionsData.submissions || []);
        }

        if (solutionsRes.ok) {
          const solutionsData = await solutionsRes.json();
          setSolutions(solutionsData.solutions || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(defaultCodes[lang] || "");
  };

  const handleLikeSolution = async (solutionId: number) => {
    if (!user) {
      toast.error("请先登录");
      router.push("/login");
      return;
    }

    const isLiked = likedSolutions.has(solutionId);
    const action = isLiked ? "unlike" : "like";

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "solution",
          targetId: solutionId,
          action,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLikedSolutions(prev => {
          const newSet = new Set(prev);
          if (data.liked) {
            newSet.add(solutionId);
          } else {
            newSet.delete(solutionId);
          }
          return newSet;
        });
        // 更新题解的点赞数
        setSolutions(prev =>
          prev.map(s =>
            s.id === solutionId ? { ...s, likes: data.likes } : s
          )
        );
      }
    } catch (error) {
      toast.error("操作失败");
    }
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast.error("请输入代码");
      return;
    }

    setIsRunning(true);
    setOutput("运行中...");

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, input }),
      });

      const data = await res.json();
      setOutput(data.output || data.error || "运行完成");
    } catch (error) {
      setOutput("运行失败");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("请先登录");
      router.push("/login");
      return;
    }

    if (!code.trim()) {
      toast.error("请输入代码");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem?.id,
          language,
          code,
          contestId: contestId ? parseInt(contestId) : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("提交成功");
        if (data.submission) {
          // OI赛制隐藏状态
          if (data.submission.status === "hidden") {
            setOutput(
              `状态: ???\n得分: ???\n用时: ???\n内存: ???\n\n${data.submission.message || "比赛结束后显示评测结果"}`
            );
          } else if (data.submission.error_message) {
            // 使用后端格式化的评测反馈
            setOutput(data.submission.error_message);
          } else {
            // 兼容旧格式
            setOutput(
              `状态: ${data.submission.status}\n得分: ${data.submission.score}\n用时: ${data.submission.time_used}ms\n内存: ${data.submission.memory_used}KB`
            );
          }
        }
        // 刷新提交记录
        fetchSubmissions();
      } else {
        toast.error(data.error || "提交失败");
      }
    } catch (error) {
      toast.error("提交失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/submissions/problem/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  if (!problem) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>题目不存在</p>
        <Button className="mt-4" asChild>
          <Link href="/problems">返回题目列表</Link>
        </Button>
      </div>
    );
  }

  const diffConfig = difficultyConfig[problem.difficulty] || difficultyConfig.popular;
  const catConfig = categoryConfig[problem.category] || categoryConfig.P;
  
  // 检查是否可以编辑/删除
  const canEdit = user && (
    user.role === "super_admin" || 
    (user.role === "admin" && problem.author?.role !== "super_admin") ||
    user.id === problem.author_id
  );

  const handleDelete = async () => {
    if (!confirm("确定要删除这道题目吗？此操作不可恢复。")) return;

    try {
      const res = await fetch(`/api/problems/${problem.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("题目已删除");
        router.push("/problems");
      } else {
        const data = await res.json();
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" asChild>
          <Link href={contestId ? `/contests/${contestId}` : "/problems"}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {contestId ? "返回比赛题目列表" : "返回题目列表"}
          </Link>
        </Button>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/problems/${problem.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：题目信息 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={catConfig.color}>{catConfig.label}{problem.id}</span>
                  <CardTitle className="text-2xl">{problem.title}</CardTitle>
                </div>
                <Badge className={`${diffConfig.bg} text-white`}>
                  {diffConfig.label}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {problem.tags?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                <span>时间限制: {problem.time_limit}ms</span>
                <span>内存限制: {problem.memory_limit}MB</span>
                <span>提交: {(problem as any).submission_count || 0}</span>
                <span>通过: {(problem as any).accepted_count || 0}</span>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="description">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="description">题目描述</TabsTrigger>
              <TabsTrigger value="solutions">题解</TabsTrigger>
            </TabsList>
            <TabsContent value="description">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">题目描述</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {problem.description}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {problem.input_format && (
                    <div>
                      <h3 className="font-semibold mb-2">输入格式</h3>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {problem.input_format}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {problem.output_format && (
                    <div>
                      <h3 className="font-semibold mb-2">输出格式</h3>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {problem.output_format}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {problem.samples?.map((sample, index) => (
                    <div key={index}>
                      <h3 className="font-semibold mb-2">样例输入 {index + 1}</h3>
                      <pre className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto">
                        {sample.input}
                      </pre>
                      <h3 className="font-semibold mb-2 mt-4">样例输出 {index + 1}</h3>
                      <pre className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto">
                        {sample.output}
                      </pre>
                    </div>
                  ))}

                  {problem.hint && (
                    <div>
                      <h3 className="font-semibold mb-2">提示</h3>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {problem.hint}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* 作者信息 */}
                  {problem.author && (
                    <div className="pt-4 border-t">
                      <span className="text-sm text-muted-foreground">出题人： </span>
                      <Link 
                        href={`/profile/${problem.author.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {problem.author.username}
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="solutions">
              <Card>
                <CardContent className="pt-6">
                  {solutions.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无题解</p>
                      {user && (
                        <Button asChild className="mt-4" variant="outline">
                          <Link href={`/problems/${problem.id}/solutions/create`}>
                            撰写题解
                          </Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {solutions.map((solution) => (
                        <div 
                          key={solution.id} 
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{solution.title}</h4>
                            <span className="text-sm text-muted-foreground">
                              {new Date(solution.created_at).toLocaleString("zh-CN")}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            {solution.users && (
                              <Link 
                                href={`/profile/${solution.users.id}`}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                              >
                                {solution.users.username}
                              </Link>
                            )}
                            <button
                              onClick={() => handleLikeSolution(solution.id)}
                              className={`flex items-center gap-1 transition-colors ${
                                likedSolutions.has(solution.id) 
                                  ? "text-red-500" 
                                  : "text-muted-foreground hover:text-red-500"
                              }`}
                            >
                              {likedSolutions.has(solution.id) ? "❤️" : "🤍"} {solution.likes}
                            </button>
                          </div>
                          <div className="mt-3 prose prose-sm dark:prose-invert max-w-none line-clamp-3">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {solution.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}
                      {user && (
                        <div className="text-center pt-4">
                          <Button asChild variant="outline">
                            <Link href={`/problems/${problem.id}/solutions/create`}>
                              撰写题解
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 右侧：代码编辑器 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpp">C++</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRun}
                    disabled={isRunning}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isRunning ? "运行中" : "运行"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? "提交中" : "提交"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">代码</label>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="font-mono min-h-[300px]"
                  placeholder="在此输入代码..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">输入</label>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="font-mono min-h-[80px]"
                  placeholder="输入测试数据..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">输出</label>
                <pre className="bg-muted p-3 rounded-md font-mono text-sm min-h-[100px] whitespace-pre-wrap">
                  {output || "运行结果将显示在这里..."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
