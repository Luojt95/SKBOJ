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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X, Save, Eye, Edit } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Sample {
  input: string;
  output: string;
}

interface TestCase {
  input: string;
  output: string;
}

// 洛谷风格难度配置
const difficultyConfig: Record<string, { color: string; bg: string; label: string }> = {
  entry: { color: "text-gray-600", bg: "bg-gray-400", label: "入门" },
  popular: { color: "text-green-600", bg: "bg-green-500", label: "普及" },
  improve: { color: "text-blue-600", bg: "bg-blue-500", label: "提高" },
  provincial: { color: "text-purple-600", bg: "bg-purple-500", label: "省选" },
  noi: { color: "text-orange-600", bg: "bg-orange-500", label: "NOI" },
  noip: { color: "text-red-600", bg: "bg-red-500", label: "NOI+" },
};

export default function CreateProblemPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    inputFormat: "",
    outputFormat: "",
    hint: "",
    difficulty: "popular",
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

  // Markdown 编辑器组件
  const MarkdownEditor = ({ 
    value, 
    onChange, 
    label, 
    placeholder 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    label: string;
    placeholder?: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="edit" className="flex items-center gap-1">
            <Edit className="h-3 w-3" />
            编辑
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            预览
          </TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={6}
            className="font-mono"
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="border rounded-lg p-4 min-h-[150px] prose prose-sm dark:prose-invert max-w-none">
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            ) : (
              <span className="text-muted-foreground">暂无内容</span>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  const currentDiff = difficultyConfig[formData.difficulty] || difficultyConfig.popular;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">创建题目</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：编辑区 */}
        <div className="lg:col-span-2 space-y-6">
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
                  placeholder="例如：A+B Problem"
                  required
                />
              </div>

              <MarkdownEditor
                label="题目描述 *"
                value={formData.description}
                onChange={(v) => setFormData({ ...formData, description: v })}
                placeholder="支持 Markdown 语法，例如：**粗体**、*斜体*、`代码`等"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MarkdownEditor
                  label="输入格式"
                  value={formData.inputFormat}
                  onChange={(v) => setFormData({ ...formData, inputFormat: v })}
                  placeholder="描述输入格式..."
                />
                <MarkdownEditor
                  label="输出格式"
                  value={formData.outputFormat}
                  onChange={(v) => setFormData({ ...formData, outputFormat: v })}
                  placeholder="描述输出格式..."
                />
              </div>

              <MarkdownEditor
                label="提示"
                value={formData.hint}
                onChange={(v) => setFormData({ ...formData, hint: v })}
                placeholder="给选手的提示信息..."
              />
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
                        className="font-mono text-sm"
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
                        className="font-mono text-sm"
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
                        className="font-mono text-sm"
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
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {testCases.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  点击"添加测试点"添加测试数据
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：设置和预览 */}
        <div className="space-y-6">
          {/* 题目设置 */}
          <Card>
            <CardHeader>
              <CardTitle>题目设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <SelectItem value="entry">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-gray-400" />
                        入门
                      </div>
                    </SelectItem>
                    <SelectItem value="popular">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-500" />
                        普及
                      </div>
                    </SelectItem>
                    <SelectItem value="improve">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-blue-500" />
                        提高
                      </div>
                    </SelectItem>
                    <SelectItem value="provincial">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-purple-500" />
                        省选
                      </div>
                    </SelectItem>
                    <SelectItem value="noi">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-orange-500" />
                        NOI
                      </div>
                    </SelectItem>
                    <SelectItem value="noip">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-500" />
                        NOI+
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">时间 (ms)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timeLimit: parseInt(e.target.value) || 1000,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memoryLimit">内存 (MB)</Label>
                  <Input
                    id="memoryLimit"
                    type="number"
                    value={formData.memoryLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        memoryLimit: parseInt(e.target.value) || 256,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>标签</Label>
                <div className="flex gap-2">
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
                  <Button type="button" size="icon" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 text-xs">
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

          {/* 题目预览 */}
          <Card>
            <CardHeader>
              <CardTitle>题目预览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{formData.title || "题目标题"}</h3>
                  <Badge className={`${currentDiff.bg} text-white text-xs`}>
                    {currentDiff.label}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground flex gap-4">
                  <span>{formData.timeLimit}ms</span>
                  <span>{formData.memoryLimit}MB</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 提交按钮 */}
          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "保存中..." : "保存题目"}
            </Button>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>
            取消
          </Button>
        </div>
      </form>
    </div>
  );
}
