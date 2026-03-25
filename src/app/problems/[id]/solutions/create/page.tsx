"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Problem {
  id: number;
  title: string;
}

export default function CreateSolutionPage() {
  const params = useParams();
  const router = useRouter();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await fetch(`/api/problems/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setProblem(data.problem);
          // 设置默认标题：【题目名】题解
          if (data.problem?.title) {
            setTitle(`【${data.problem.title}】题解`);
          }
        }
      } catch (error) {
        console.error("Failed to fetch problem:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProblem();
  }, [params.id]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("请输入题解标题");
      return;
    }
    if (!content.trim()) {
      toast.error("请输入题解内容");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/solutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: parseInt(params.id as string),
          title,
          content,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("题解发布成功");
        router.push(`/problems/${params.id}`);
      } else {
        toast.error(data.error || "发布失败");
      }
    } catch {
      toast.error("发布失败");
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link href={`/problems/${params.id}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回题目
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>撰写题解 - {problem.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">题解标题</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入题解标题..."
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">题解内容（支持 Markdown）</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] font-mono"
              placeholder="请输入题解内容，支持 Markdown 格式..."
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">预览</label>
            <div className="border rounded-md p-4 min-h-[200px] prose prose-sm dark:prose-invert max-w-none">
              {content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {content}
                </ReactMarkdown>
              ) : (
                <span className="text-muted-foreground">预览区域</span>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href={`/problems/${params.id}`}>取消</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "发布中..." : "发布题解"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
