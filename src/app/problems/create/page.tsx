"use client";

import { useState, useEffect, useRef } from "react";
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
import { Plus, X, Save, Upload, FileArchive, CheckCircle2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { difficultyConfig, categoryConfig } from "@/lib/constants";

interface Sample {
  input: string;
  output: string;
}

interface TestCase {
  input: string;
  output: string;
  inputKey?: string;
  outputKey?: string;
  score: number;
}

// Markdown 编辑器组件 - 左右分栏实时预览
function MarkdownEditor({ 
  value, 
  onChange, 
  label, 
  placeholder,
  rows = 8
}: { 
  value: string; 
  onChange: (value: string) => void; 
  label: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {label}
        <span className="text-xs text-muted-foreground">(支持Markdown和LaTeX)</span>
      </Label>
      <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/30">
        {/* 左侧：输入框 */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            编辑
          </div>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="font-mono text-sm resize-none border-0 bg-background shadow-sm focus-visible:ring-1"
          />
        </div>
        {/* 右侧：预览 */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            预览
          </div>
          <div className={`prose prose-sm dark:prose-invert max-w-none bg-background rounded-md p-3 min-h-[${rows * 24}px] overflow-auto border shadow-sm`}>
            {value ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <span className="text-muted-foreground text-sm">预览区域</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
    category: "P",
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setTestCases([...testCases, { input: "", output: "", score: 10 }]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleUpdateTestCase = (index: number, field: keyof TestCase, value: string | number) => {
    const newTestCases = [...testCases];
    (newTestCases[index] as any)[field] = value;
    setTestCases(newTestCases);
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      toast.error("请上传ZIP文件");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/testdata/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        setTestCases(data.testCases);
      } else {
        toast.error(data.error || "上传失败");
      }
    } catch {
      toast.error("上传失败，请重试");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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

  const currentDiff = difficultyConfig[formData.difficulty] || difficultyConfig.popular;
  const currentCat = categoryConfig[formData.category] || categoryConfig.P;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">创建题目</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 space-y-2">
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
              <div className="space-y-2">
                <Label>题库</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className={config.color}>{config.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <MarkdownEditor
              label="题目描述 *"
              value={formData.description}
              onChange={(v) => setFormData({ ...formData, description: v })}
              placeholder="描述题目背景和要求...&#10;&#10;支持 **粗体**、*斜体*、`代码`、列表等Markdown语法"
              rows={10}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MarkdownEditor
                label="输入格式"
                value={formData.inputFormat}
                onChange={(v) => setFormData({ ...formData, inputFormat: v })}
                placeholder="描述输入格式..."
                rows={6}
              />
              <MarkdownEditor
                label="输出格式"
                value={formData.outputFormat}
                onChange={(v) => setFormData({ ...formData, outputFormat: v })}
                placeholder="描述输出格式..."
                rows={6}
              />
            </div>

            <MarkdownEditor
              label="提示"
              value={formData.hint}
              onChange={(v) => setFormData({ ...formData, hint: v })}
              placeholder="给选手的提示信息..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* 题目设置 */}
        <Card>
          <CardHeader>
            <CardTitle>题目设置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                    {Object.entries(difficultyConfig).filter(([key]) => !['unknown', 'easy', 'medium', 'hard'].includes(key)).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded ${config.bg}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeLimit">时间限制 (ms)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min={1}
                  max={10000}
                  value={formData.timeLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      timeLimit: Math.min(10000, Math.max(1, parseInt(e.target.value) || 1000)),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryLimit">内存限制 (MB)</Label>
                <Input
                  id="memoryLimit"
                  type="number"
                  min={1}
                  max={1024}
                  value={formData.memoryLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      memoryLimit: Math.min(1024, Math.max(1, parseInt(e.target.value) || 256)),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>标签</Label>
                <div className="flex gap-1">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="添加标签"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="text-sm"
                  />
                  <Button type="button" size="icon" variant="outline" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>可见性</Label>
                <div className="flex items-center h-10">
                  <Switch
                    checked={formData.isVisible}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isVisible: checked })
                    }
                  />
                  <span className="ml-2 text-sm">{formData.isVisible ? "公开" : "隐藏"}</span>
                </div>
              </div>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="gap-1 text-xs cursor-pointer hover:bg-muted/80"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 样例 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              样例数据
              <Button type="button" variant="outline" size="sm" onClick={handleAddSample}>
                <Plus className="h-4 w-4 mr-2" />
                添加样例
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {samples.map((sample, index) => (
              <div key={index} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">样例 {index + 1}</span>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">输入</Label>
                    <Textarea
                      value={sample.input}
                      onChange={(e) =>
                        handleUpdateSample(index, "input", e.target.value)
                      }
                      rows={3}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">输出</Label>
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
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="hidden"
                  id="zip-upload"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileArchive className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? "上传中..." : "上传ZIP"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleAddTestCase}>
                  <Plus className="h-4 w-4 mr-2" />
                  手动添加
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testCases.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                <FileArchive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">上传ZIP文件快速导入测试数据</p>
                <p className="text-xs mb-4">ZIP文件需包含成对的 .in 和 .out 文件</p>
                <p className="text-xs text-muted-foreground">或点击"手动添加"逐个添加测试点</p>
              </div>
            ) : (
              <>
                {/* 分数总计 */}
                <div className="flex items-center justify-between mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    测试点总数: {testCases.length}
                  </span>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    分数总计: {testCases.reduce((sum, tc) => sum + (tc.score || 0), 0)} 分
                  </span>
                </div>
                
                {/* 测试点列表 */}
                <div className="space-y-3">
                  {testCases.map((testCase, index) => (
                    <div 
                      key={index} 
                      className="border rounded-lg p-4 bg-muted/30"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">测试点 #{index + 1}</span>
                          {testCase.inputKey && testCase.outputKey && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              已存储
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={testCase.score}
                              onChange={(e) =>
                                handleUpdateTestCase(index, "score", parseInt(e.target.value) || 0)
                              }
                              className="w-16 h-8 text-center font-mono"
                              min={0}
                              max={100}
                            />
                            <span className="text-xs text-muted-foreground">分</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveTestCase(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* 只有手动添加的测试点才显示输入框 */}
                      {(!testCase.inputKey || !testCase.outputKey) && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs">输入</Label>
                            <Textarea
                              value={testCase.input}
                              onChange={(e) =>
                                handleUpdateTestCase(index, "input", e.target.value)
                              }
                              rows={3}
                              className="font-mono text-sm"
                              placeholder="输入数据..."
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">输出</Label>
                            <Textarea
                              value={testCase.output}
                              onChange={(e) =>
                                handleUpdateTestCase(index, "output", e.target.value)
                              }
                              rows={3}
                              className="font-mono text-sm"
                              placeholder="期望输出..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 提交按钮 */}
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
