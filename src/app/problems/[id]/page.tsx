"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { ArrowLeft, Play, Send, BookOpen } from "lucide-react";

interface Problem {
  id: number;
  title: string;
  description: string;
  input_format: string;
  output_format: string;
  samples: Array<{ input: string; output: string }>;
  hint: string;
  difficulty: string;
  time_limit: number;
  memory_limit: number;
  tags: string[];
  author_id: number;
  is_visible: boolean;
}

interface User {
  id: number;
  username: string;
  role: string;
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-500",
  medium: "bg-yellow-500",
  hard: "bg-red-500",
};

const difficultyLabels: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

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

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [user, setUser] = useState<User | null>(null);
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
        const [problemRes, userRes] = await Promise.all([
          fetch(`/api/problems/${params.id}`),
          fetch("/api/auth/me"),
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
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("提交成功");
        if (data.submission) {
          setOutput(
            `状态: ${data.submission.status}\n得分: ${data.submission.score}\n用时: ${data.submission.time_used}ms\n内存: ${data.submission.memory_used}KB`
          );
        }
      } else {
        toast.error(data.error || "提交失败");
      }
    } catch (error) {
      toast.error("提交失败");
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" className="mb-4" asChild>
        <Link href="/problems">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回题目列表
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：题目信息 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{problem.title}</CardTitle>
                <Badge className={`${difficultyColors[problem.difficulty]} text-white`}>
                  {difficultyLabels[problem.difficulty]}
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
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">题目描述</TabsTrigger>
              <TabsTrigger value="solutions">题解</TabsTrigger>
            </TabsList>
            <TabsContent value="description">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">题目描述</h3>
                    <p className="whitespace-pre-wrap">{problem.description}</p>
                  </div>

                  {problem.input_format && (
                    <div>
                      <h3 className="font-semibold mb-2">输入格式</h3>
                      <p className="whitespace-pre-wrap">{problem.input_format}</p>
                    </div>
                  )}

                  {problem.output_format && (
                    <div>
                      <h3 className="font-semibold mb-2">输出格式</h3>
                      <p className="whitespace-pre-wrap">{problem.output_format}</p>
                    </div>
                  )}

                  {problem.samples?.map((sample, index) => (
                    <div key={index}>
                      <h3 className="font-semibold mb-2">样例输入 {index + 1}</h3>
                      <pre className="bg-muted p-3 rounded-md font-mono text-sm">
                        {sample.input}
                      </pre>
                      <h3 className="font-semibold mb-2 mt-4">样例输出 {index + 1}</h3>
                      <pre className="bg-muted p-3 rounded-md font-mono text-sm">
                        {sample.output}
                      </pre>
                    </div>
                  ))}

                  {problem.hint && (
                    <div>
                      <h3 className="font-semibold mb-2">提示</h3>
                      <p className="whitespace-pre-wrap">{problem.hint}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="solutions">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无题解</p>
                    {user && (
                      <Button className="mt-4" variant="outline">
                        撰写题解
                      </Button>
                    )}
                  </div>
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
