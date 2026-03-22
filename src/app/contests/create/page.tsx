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
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Problem {
  id: number;
  title: string;
  difficulty: string;
}

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

    setIsLoading(true);

    try {
      const res = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
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
              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="isVisible"
                  checked={formData.isVisible}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isVisible: checked as boolean })
                  }
                />
                <Label htmlFor="isVisible">公开可见</Label>
              </div>
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
                    <span className="font-mono mr-2">#{problem.id}</span>
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
