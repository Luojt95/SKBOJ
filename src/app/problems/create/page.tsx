"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X, Save } from "lucide-react";

interface Sample {
  input: string;
  output: string;
}

interface TestCase {
  input: string;
  output: string;
}

export default function CreateProblemPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    inputFormat: "",
    outputFormat: "",
    hint: "",
    difficulty: "medium",
    timeLimit: 1000,
    memoryLimit: 256,
    isVisible: true,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [samples, setSamples] = useState<Sample[]>([{ input: "", output: "" }]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [user, setUser] = useState<{ id: number; role: string } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user?.role !== "admin" && data.user?.role !== "super_admin") {
          toast.error("没有权限创建题目");
          router.push("/problems");
        }
      } else {
        toast.error("请先登录");
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAddSample = () => {
    setSamples([...samples, { input: "", output: "" }]);
  };

  const handleRemoveSample = (index: number) => {
    setSamples(samples.filter((_, i) => i !== index));
  };

  const handleUpdateSample = (index: number, field: "input" | "output", value: string) => {
    const newSamples = [...samples];
    newSamples[index][field] = value;
    setSamples(newSamples);
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: "", output: "" }]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleUpdateTestCase = (index: number, field: "input" | "output", value: string) => {
    const newTestCases = [...testCases];
    newTestCases[index][field] = value;
    setTestCases(newTestCases);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags,
          samples,
          testCases,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("题目创建成功");
        router.push("/problems");
      } else {
        toast.error(data.error || "创建失败");
      }
    } catch {
      toast.error("创建失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">创建题目</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">题目标题 *</Label>
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
              <Label htmlFor="description">题目描述 *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inputFormat">输入格式</Label>
                <Textarea
                  id="inputFormat"
                  value={formData.inputFormat}
                  onChange={(e) =>
                    setFormData({ ...formData, inputFormat: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outputFormat">输出格式</Label>
                <Textarea
                  id="outputFormat"
                  value={formData.outputFormat}
                  onChange={(e) =>
                    setFormData({ ...formData, outputFormat: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hint">提示</Label>
              <Textarea
                id="hint"
                value={formData.hint}
                onChange={(e) =>
                  setFormData({ ...formData, hint: e.target.value })
                }
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* 题目设置 */}
        <Card>
          <CardHeader>
            <CardTitle>题目设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>难度</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) =>
                    setFormData({ ...formData, difficulty: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">简单</SelectItem>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="hard">困难</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeLimit">时间限制 (ms)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      timeLimit: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryLimit">内存限制 (MB)</Label>
                <Input
                  id="memoryLimit"
                  type="number"
                  value={formData.memoryLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      memoryLimit: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>标签</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="输入标签"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isVisible}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isVisible: checked })
                }
              />
              <Label>公开可见</Label>
            </div>
          </CardContent>
        </Card>

        {/* 样例 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              样例
              <Button type="button" variant="outline" size="sm" onClick={handleAddSample}>
                <Plus className="h-4 w-4 mr-2" />
                添加样例
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {samples.map((sample, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">样例 {index + 1}</span>
                  {samples.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSample(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>输入</Label>
                    <Textarea
                      value={sample.input}
                      onChange={(e) =>
                        handleUpdateSample(index, "input", e.target.value)
                      }
                      rows={3}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>输出</Label>
                    <Textarea
                      value={sample.output}
                      onChange={(e) =>
                        handleUpdateSample(index, "output", e.target.value)
                      }
                      rows={3}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 测试数据 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              测试数据
              <Button type="button" variant="outline" size="sm" onClick={handleAddTestCase}>
                <Plus className="h-4 w-4 mr-2" />
                添加测试点
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testCases.map((testCase, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">测试点 {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTestCase(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>输入</Label>
                    <Textarea
                      value={testCase.input}
                      onChange={(e) =>
                        handleUpdateTestCase(index, "input", e.target.value)
                      }
                      rows={3}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>输出</Label>
                    <Textarea
                      value={testCase.output}
                      onChange={(e) =>
                        handleUpdateTestCase(index, "output", e.target.value)
                      }
                      rows={3}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-purple-600"
            disabled={isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "保存中..." : "保存题目"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
        </div>
      </form>
    </div>
  );
}
