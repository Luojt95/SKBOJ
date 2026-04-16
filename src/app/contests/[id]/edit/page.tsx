"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ArrowLeft, Loader2, Trophy } from "lucide-react";
import Link from "next/link";
import { categoryConfig } from "@/lib/constants";

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  category: string;
  category_index: number | null;
}

// 根据题库和题目序号生成题目编号
const getProblemNumber = (problem: Problem) => {
  const prefix = problem.category || "P";
  const index = problem.category_index || problem.id;
  return `${prefix}${String(index).padStart(4, '0')}`;
};

interface Contest {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  type: string;
  problem_ids: number[];
  is_visible: boolean;
  div: string;
  rating_calculated: boolean;
}

export default function EditContestPage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    type: "oi",
    div: "Div.4",
    isVisible: true,
  });
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取所有题目
        const problemsRes = await fetch("/api/problems");
        if (problemsRes.ok) {
          const data = await problemsRes.json();
          setProblems(data.problems || []);
        }

        // 获取比赛信息
        const contestRes = await fetch(`/api/contests/${params.id}`);
        if (contestRes.ok) {
          const data = await contestRes.json();
          const contest: Contest = data.contest;
          
          // 填充表单数据
          setFormData({
            title: contest.title,
            description: contest.description || "",
            startTime: contest.start_time.slice(0, 16), // 格式化为 datetime-local
            endTime: contest.end_time.slice(0, 16),
            type: contest.type,
            div: contest.div || "Div.4",
            isVisible: contest.is_visible,
          });
          setSelectedProblems(contest.problem_ids || []);
        } else {
          toast.error("比赛不存在");
          router.push("/contests");
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("加载失败");
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [params.id, router]);

  const handleProblemToggle = (problemId: number) => {
    setSelectedProblems((prev) =>
      prev.includes(problemId)
        ? prev.filter((id) => id !== problemId)
        : [...prev, problemId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProblems.length === 0) {
      toast.error("请至少选择一道题目");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/contests/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          problemIds: selectedProblems,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("比赛更新成功");
        router.push(`/contests/${params.id}`);
      } else {
        toast.error(data.error || "更新失败");
      }
    } catch {
      toast.error("更新失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" className="mb-4" asChild>
        <Link href={`/contests/${params.id}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回比赛详情
        </Link>
      </Button>

      <h1 className="text-3xl font-bold mb-8">编辑比赛</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">比赛标题 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">比赛描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">开始时间 *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">结束时间 *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>赛制</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oi">OI赛制</SelectItem>
                    <SelectItem value="ioi">IOI赛制</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Div 等级</Label>
                <Select
                  value={formData.div}
                  onValueChange={(value) =>
                    setFormData({ ...formData, div: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Div.1">Div.1（最高等级）</SelectItem>
                    <SelectItem value="Div.2">Div.2（中高等级）</SelectItem>
                    <SelectItem value="Div.3">Div.3（中等等级）</SelectItem>
                    <SelectItem value="Div.4">Div.4（入门，不计Rating）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Div 说明 */}
            {formData.div !== "Div.4" ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="font-medium text-sm">Div {formData.div} 会计入 Rating</span>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  比赛结束后，根据排名计算并更新参赛者的 Rating
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="font-medium text-sm">Div.4 不计入 Rating</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  适合入门比赛，不会影响参赛者的 Rating
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isVisible"
                checked={formData.isVisible}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isVisible: checked as boolean })
                }
              />
              <Label htmlFor="isVisible">公开可见</Label>
            </div>
          </CardContent>
        </Card>

        {/* 题目选择 */}
        <Card>
          <CardHeader>
            <CardTitle>选择题目（已选 {selectedProblems.length} 题）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {problems.map((problem) => (
                <div
                  key={problem.id}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-muted"
                >
                  <Checkbox
                    id={`problem-${problem.id}`}
                    checked={selectedProblems.includes(problem.id)}
                    onCheckedChange={() => handleProblemToggle(problem.id)}
                  />
                  <Label
                    htmlFor={`problem-${problem.id}`}
                    className="cursor-pointer flex-1"
                  >
                    <span className="font-mono mr-2">{getProblemNumber(problem)}</span>
                    {problem.title}
                  </Label>
                </div>
              ))}
              {problems.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  暂无可用题目，请先创建题目
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-purple-600"
            disabled={isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "保存中..." : "保存修改"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
        </div>
      </form>
    </div>
  );
}
