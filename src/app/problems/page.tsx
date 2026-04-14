"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Plus, Code, MinusCircle, RefreshCw, Tags, Settings, X, Edit2, Trash2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { difficultyConfig, categoryConfig } from "@/lib/constants";

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  category: string;
  category_index: number | null;
  tags: Tag[];
  author_id: number;
  is_visible: boolean;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

interface ProblemStatus {
  status: string;
  bestScore: number;
}

interface TagFormData {
  name: string;
  color: string;
}

const tagColors = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#64748b", "#78716c", "#92400e",
];

const statusConfig: Record<string, { label: string; bgClass: string }> = {
  ac: { label: "AC", bgClass: "bg-green-500 text-white" },
  wa: { label: "WA", bgClass: "bg-red-500 text-white" },
  tle: { label: "TLE", bgClass: "bg-yellow-500 text-white" },
  mle: { label: "MLE", bgClass: "bg-orange-500 text-white" },
  re: { label: "RE", bgClass: "bg-purple-500 text-white" },
  ce: { label: "CE", bgClass: "bg-gray-500 text-white" },
  pac: { label: "UAC", bgClass: "bg-red-500 text-white" },
};

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [problemStatus, setProblemStatus] = useState<Record<number, ProblemStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");
  const [isReordering, setIsReordering] = useState(false);
  
  // 标签相关状态
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagManageDialogOpen, setTagManageDialogOpen] = useState(false);
  const [tagForm, setTagForm] = useState<TagFormData>({ name: "", color: "#3b82f6" });
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagManageLoading, setTagManageLoading] = useState(false);

  const fetchProblems = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedTags.length > 0) {
        params.set("tags", selectedTags.join(","));
      }
      
      const res = await fetch(`/api/problems?${params.toString()}`);
      const data = await res.json();
      setProblems(data.problems || []);
    } catch (error) {
      console.error("Failed to fetch problems:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      setAllTags(data.tags || []);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取当前用户
        const userRes = await fetch("/api/auth/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);

          // 获取用户提交状态
          if (userData.user) {
            const statusRes = await fetch("/api/submissions/status");
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              setProblemStatus(statusData.status || {});
            }
          }
        }

        // 获取标签列表
        await fetchTags();
        // 获取题目列表
        await fetchProblems();
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 标签筛选变化时重新获取题目
  useEffect(() => {
    if (!isLoading) {
      fetchProblems();
    }
  }, [selectedTags]);

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = problem.title.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficulty === "all" || problem.difficulty === difficulty;
    const matchesCategory = category === "all" || problem.category === category;
    return matchesSearch && matchesDifficulty && matchesCategory;
  });

  const canManageTags = user && (user.role === "admin" || user.role === "super_admin");
  const canCreateProblem = user && (user.role === "admin" || user.role === "super_admin");

  // 标签选择
  const handleTagToggle = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  // 标签管理
  const handleCreateTag = async () => {
    if (!tagForm.name.trim()) {
      toast.error("请输入标签名称");
      return;
    }

    setTagManageLoading(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...tagForm }),
      });
      const data = await res.json();
      
      if (data.tag) {
        toast.success("标签创建成功");
        setTagForm({ name: "", color: "#3b82f6" });
        await fetchTags();
      } else {
        toast.error(data.error || "创建失败");
      }
    } catch (error) {
      toast.error("创建失败");
    } finally {
      setTagManageLoading(false);
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !tagForm.name.trim()) {
      toast.error("请输入标签名称");
      return;
    }

    setTagManageLoading(true);
    try {
      const res = await fetch(`/api/tags?id=${editingTag.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tagForm),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("标签更新成功");
        setEditingTag(null);
        setTagForm({ name: "", color: "#3b82f6" });
        await fetchTags();
      } else {
        toast.error(data.error || "更新失败");
      }
    } catch (error) {
      toast.error("更新失败");
    } finally {
      setTagManageLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!confirm("确定要删除此标签吗？")) return;

    setTagManageLoading(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: tagId }),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("标签删除成功");
        // 移除选中的标签
        setSelectedTags(prev => prev.filter(id => id !== tagId));
        await fetchTags();
      } else {
        toast.error(data.error || "删除失败");
      }
    } catch (error) {
      toast.error("删除失败");
    } finally {
      setTagManageLoading(false);
    }
  };

  const startEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setTagForm({ name: tag.name, color: tag.color });
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setTagForm({ name: "", color: "#3b82f6" });
  };

  // 整理题号
  const handleReorderProblems = async () => {
    if (!confirm("确定要整理题号吗？此操作将按题库分类重新分配题目编号（如P0001, P0002...）。")) {
      return;
    }

    setIsReordering(true);
    try {
      const res = await fetch("/api/problems/reorder", {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`整理完成，共整理了 ${data.updatedCount} 道题目`);
        // 刷新页面
        window.location.reload();
      } else {
        toast.error(data.error || "整理失败");
      }
    } catch (error) {
      toast.error("整理失败");
    } finally {
      setIsReordering(false);
    }
  };

  // 根据题库和题目序号生成题目编号
  const getProblemNumber = (problem: Problem) => {
    const prefix = problem.category || "P";
    const index = problem.category_index || problem.id;
    return `${prefix}${String(index).padStart(4, '0')}`;
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
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReorderProblems}
              disabled={isReordering}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isReordering ? "animate-spin" : ""}`} />
              整理题号
            </Button>
            <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Link href="/problems/create">
                <Plus className="h-4 w-4 mr-2" />
                创建题目
              </Link>
            </Button>
          </div>
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
            
            {/* 标签筛选按钮 */}
            <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="relative">
                  <Tags className="h-4 w-4 mr-2" />
                  标签筛选
                  {selectedTags.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {selectedTags.length}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>选择标签（AND 筛选）</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    选中的标签必须全部匹配才会显示题目
                  </p>
                </DialogHeader>
                <div className="max-h-80 overflow-y-auto py-4">
                  {allTags.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">暂无标签</p>
                  ) : (
                    <div className="space-y-2">
                      {allTags.map((tag) => (
                        <div key={tag.id} className="flex items-center gap-3">
                          <Checkbox
                            id={`tag-${tag.id}`}
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={() => handleTagToggle(tag.id)}
                          />
                          <Label
                            htmlFor={`tag-${tag.id}`}
                            className="flex items-center gap-2 cursor-pointer flex-1"
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={handleClearTags}>
                    清除筛选
                  </Button>
                  <Button onClick={() => setTagDialogOpen(false)}>
                    确认 ({selectedTags.length})
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* 标签管理按钮 */}
            {canManageTags && (
              <Button variant="ghost" onClick={() => setTagManageDialogOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                管理标签
              </Button>
            )}
          </div>

          {/* 已选中的标签展示 */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">已选标签：</span>
              {selectedTags.map(tagId => {
                const tag = allTags.find(t => t.id === tagId);
                return tag ? (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    onClick={() => handleTagToggle(tag.id)}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                    <X className="h-3 w-3" />
                  </Badge>
                ) : null;
              })}
              <Button variant="ghost" size="sm" onClick={handleClearTags} className="h-6 px-2">
                清除全部
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 标签管理弹窗 */}
      <Dialog open={tagManageDialogOpen} onOpenChange={setTagManageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>标签管理</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 添加/编辑表单 */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label>{editingTag ? "编辑标签" : "新建标签"}</Label>
                <Input
                  placeholder="标签名称"
                  value={tagForm.name}
                  onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>颜色</Label>
                <div className="flex gap-1 flex-wrap max-w-[200px]">
                  {tagColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-6 h-6 rounded-full border-2 ${
                        tagForm.color === color ? "border-gray-800 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setTagForm({ ...tagForm, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {editingTag ? (
                <>
                  <Button onClick={handleUpdateTag} disabled={tagManageLoading}>
                    保存修改
                  </Button>
                  <Button variant="ghost" onClick={cancelEdit}>
                    取消
                  </Button>
                </>
              ) : (
                <Button onClick={handleCreateTag} disabled={tagManageLoading}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  添加标签
                </Button>
              )}
            </div>

            {/* 标签列表 */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">已有标签 ({allTags.length})</Label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {allTags.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">暂无标签</p>
                ) : (
                  allTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditTag(tag)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTag(tag.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
            const status = problemStatus[problem.id];
            const statusInfo = status ? statusConfig[status.status] : null;

            return (
              <Link key={problem.id} href={`/problems/${problem.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* 状态标签 */}
                        <div className="w-12 flex justify-center">
                          {statusInfo ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusInfo.bgClass}`}>
                              {statusInfo.label}
                            </span>
                          ) : (
                            <MinusCircle className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
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
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="text-xs gap-1"
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {status && (
                          <span className="text-sm text-blue-500 font-medium">{status.bestScore}分</span>
                        )}
                        {!problem.is_visible && (
                          <Badge variant="secondary">隐藏</Badge>
                        )}
                      </div>
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
