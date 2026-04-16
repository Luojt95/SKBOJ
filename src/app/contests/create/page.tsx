"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Save, ArrowLeft, Info, Trophy } from "lucide-react";
import Link from "next/link";
import { categoryConfig } from "@/lib/constants";
import { divConfig } from "@/lib/rating";

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

export default function CreateContestPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    type: "oi",
    format: "OI",
    adminThreshold: "",
    div: "Div.4",
    isVisible: true,
  });
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/problems");
      if (res.ok) {
        const data = await res.json();
        setProblems(data.problems || []);
      }
    };
    fetchData();
  }, []);

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

    // CS赛制需要设置门槛
    if (formData.format === "CS" && !formData.adminThreshold) {
      toast.error("CS赛制需要设置管理员门槛分数");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          adminThreshold: formData.format === "CS" ? parseInt(formData.adminThreshold) : null,
          problemIds: selectedProblems,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("比赛创建成功");
        router.push("/contests");
      } else {
        toast.error(data.error || "创建失败");
      }
    } catch {
      toast.error("创建失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" className="mb-4" asChild>
        <Link href="/contests">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回比赛列表
        </Link>
      </Button>

      <h1 className="text-3xl font-bold mb-8">创建比赛</h1>

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
                  value={formData.format}
                  onValueChange={(value) =>
                    setFormData({ ...formData, format: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OI">OI赛制</SelectItem>
                    <SelectItem value="IOI">IOI赛制</SelectItem>
                    <SelectItem value="CS">CS赛制</SelectItem>
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

            {/* CS赛制额外配置 */}
            {formData.format === "CS" && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">CS赛制说明</span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  CS赛制类似IOI赛制，但设有管理员门槛。参赛者在比赛中达到门槛分数后，将自动成为管理员。
                </p>
                <div className="space-y-2">
                  <Label htmlFor="adminThreshold">管理员门槛分数 *</Label>
                  <Input
                    id="adminThreshold"
                    type="number"
                    min="1"
                    value={formData.adminThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, adminThreshold: e.target.value })
                    }
                    placeholder="例如：300"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    参赛者总分达到此分数后自动晋升为管理员
                  </p>
                </div>
              </div>
            )}
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
            {isLoading ? "创建中..." : "创建比赛"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
        </div>
      </form>
    </div>
  );
}
