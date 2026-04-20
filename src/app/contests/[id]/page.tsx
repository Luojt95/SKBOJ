"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trophy, Clock, Play, Users, Edit, Trash2, Calculator, Home, ListOrdered, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { getUserNameColorByRatingAndRole } from "@/lib/rating";

interface Contest {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  type: string;
  format: string;
  admin_threshold: number | null;
  problem_ids: number[];
  author_id: number;
  div: string;
  rating_calculated: boolean;
  users?: {
    id: number;
    username: string;
    role: string;
  };
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
}

interface Participant {
  id: number;
  user_id: number;
  score: number;
  problem_scores?: Record<string, number>;
  users: { id: number; username: string; role: string; rating?: number };
}

interface Submission {
  problem_id: number;
  score: number;
}

interface User {
  id: number;
  username: string;
  role: string;
  rating?: number;
}

type TabType = "home" | "problems" | "standing";

const formatLabels: Record<string, string> = {
  OI: "OI赛制",
  IOI: "IOI赛制",
  CS: "CS赛制",
};

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString("zh-CN");
}

function getContestStatus(startTime: string, endTime: string): string {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "ongoing";
}

export default function ContestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<Record<number, number>>({});
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("home");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contestRes, userRes] = await Promise.all([
          fetch(`/api/contests/${params.id}`),
          fetch("/api/auth/me"),
        ]);

        if (contestRes.ok) {
          const data = await contestRes.json();
          setContest(data.contest);
          setProblems(data.problems || []);
          setParticipants(data.participants || []);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
        }

        // 获取当前用户的提交记录（用于显示每题得分）
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.user) {
            const subRes = await fetch(`/api/contests/${params.id}/submissions?userId=${userData.user.id}`);
            if (subRes.ok) {
              const subData = await subRes.json();
              const submissions = subData.submissions || [];
              // 转换为 {problemId: maxScore}
              const scores: Record<number, number> = {};
              submissions.forEach((sub: Submission) => {
                const prev = scores[sub.problem_id] || 0;
                if (sub.score > prev) {
                  scores[sub.problem_id] = sub.score;
                }
              });
              setUserSubmissions(scores);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const handleJoin = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`/api/contests/${params.id}/join`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || participants);
        toast.success("报名成功！");
      } else {
        const data = await res.json();
        toast.error(data.error || "报名失败");
      }
    } catch (error) {
      console.error("Join contest error:", error);
      toast.error("报名失败");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  if (!contest) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>比赛不存在</p>
        <Button className="mt-4" asChild>
          <Link href="/contests">返回比赛列表</Link>
        </Button>
      </div>
    );
  }

  const status = getContestStatus(contest.start_time, contest.end_time);
  const isParticipant = user && participants.some((p) => p.user_id === user.id);

  const isOIContest = contest.format === "OI";
  const shouldHideScore = isOIContest && status !== "ended";

  const canEdit = user && (
    user.role === "super_admin" || 
    (user.role === "admin" && contest.users?.role !== "super_admin") ||
    user.id === contest.author_id
  );

  const handleDelete = async () => {
    if (!confirm("确定要删除这场比赛吗？此操作不可恢复。")) return;

    try {
      const res = await fetch(`/api/contests/${contest.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("比赛已删除");
        router.push("/contests");
      } else {
        const data = await res.json();
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const handleCalculateRating = async () => {
    if (!confirm("确定要计算这场比赛的 Rating 吗？此操作不可撤销。")) return;

    try {
      const res = await fetch("/api/contests/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contestId: contest.id }),
      });
    
      const data = await res.json();
    
      if (res.ok) {
        toast.success(data.message || "Rating 计算完成");
        window.location.reload();
      } else {
        toast.error(data.error || data.message || "计算失败");
      }
    } catch {
      toast.error("计算失败");
    }
  };

  // 渲染标签页按钮
  const renderTabs = () => (
    <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
      <Button
        variant={activeTab === "home" ? "default" : "ghost"}
        size="sm"
        onClick={() => setActiveTab("home")}
        className="gap-2"
      >
        <Home className="h-4 w-4" />
        首页
      </Button>
      <Button
        variant={activeTab === "problems" ? "default" : "ghost"}
        size="sm"
        onClick={() => setActiveTab("problems")}
        className="gap-2"
      >
        <ListOrdered className="h-4 w-4" />
        题目
      </Button>
      <Button
        variant={activeTab === "standing" ? "default" : "ghost"}
        size="sm"
        onClick={() => setActiveTab("standing")}
        className="gap-2"
      >
        <BarChart3 className="h-4 w-4" />
        排名
      </Button>
    </div>
  );

  // 首页内容
  const renderHomeTab = () => (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{contest.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                {formatLabels[contest.format] || contest.type || "未知赛制"}
              </Badge>
              {contest.format === "CS" && contest.admin_threshold && (
                <Badge className="bg-amber-500">
                  管理员门槛：{contest.admin_threshold}分
                </Badge>
              )}
              <Badge
                className={
                  status === "ongoing"
                    ? "bg-green-500"
                    : status === "upcoming"
                    ? "bg-blue-500"
                    : "bg-gray-500"
                }
              >
                {status === "ongoing"
                  ? "进行中"
                  : status === "upcoming"
                  ? "未开始"
                  : "已结束"}
              </Badge>

              {contest.div && (
                <Badge
                  className={
                    contest.div === "Div.1"
                      ? "bg-purple-600"
                      : contest.div === "Div.2"
                      ? "bg-blue-600"
                      : contest.div === "Div.3"
                      ? "bg-green-600"
                      : "bg-gray-500"
                  }
                >
                  {contest.div}
                  {contest.div !== "Div.4" ? "（计入Rating）" : "（不计Rating）"}
                </Badge>
              )}

              {canEdit && contest.div !== "Div.4" && status === "ended" && !contest.rating_calculated && (
                <Button variant="outline" size="sm" onClick={handleCalculateRating}>
                  <Calculator className="h-4 w-4 mr-2" />
                  计算Rating
                </Button>
              )}

              {contest.div !== "Div.4" && contest.rating_calculated && (
                <Badge variant="secondary">
                  <Calculator className="h-3 w-3 mr-1" />
                  Rating已计算
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6 mt-2 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTime(contest.start_time)} - {formatTime(contest.end_time)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {participants.length} 人参与
            </span>
            {contest.users && (
              <span className="flex items-center gap-1">
                创建者：
                <Link 
                  href={`/profile/${contest.users.id}`}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  {contest.users.username}
                </Link>
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {contest.description && (
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{contest.description}</p>
            </div>
          )}
          {contest.format === "CS" && contest.admin_threshold && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>CS赛制：</strong>参赛者在比赛中达到 <strong>{contest.admin_threshold}分</strong> 将自动成为管理员！
              </p>
            </div>
          )}
          {user && (
            <div className="mt-4">
              {isParticipant ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Badge className="bg-green-500">已报名</Badge>
                  <span className="text-sm text-muted-foreground">正在比赛中，加油！</span>
                </div>
              ) : status === "ongoing" ? (
                <Button onClick={handleJoin}>
                  <Play className="h-4 w-4 mr-2" />
                  参加比赛
                </Button>
              ) : status === "upcoming" ? (
                <Button onClick={handleJoin}>
                  <Play className="h-4 w-4 mr-2" />
                  立即报名
                </Button>
              ) : (
                <Badge variant="secondary">比赛已结束</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  // 题目列表内容
  const renderProblemsTab = () => (
    <Card>
      <CardHeader>
        <CardTitle>题目列表</CardTitle>
      </CardHeader>
      <CardContent>
        {problems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            暂无题目
          </p>
        ) : (
          <div className="space-y-2">
            {problems.map((problem, index) => (
              <Link
                key={problem.id}
                href={`/problems/${problem.id}?contest=${contest.id}`}
              >
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer border">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-lg bg-muted px-2 py-1 rounded">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <div>
                      <span className="font-medium">{problem.title}</span>
                      {user && isParticipant && userSubmissions[problem.id] > 0 && (
                        <Badge className="ml-2 bg-green-500">得分: {userSubmissions[problem.id]}</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    {status === "ongoing" && isParticipant ? "开始作答" : "查看题目"}
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 排名内容（CF风格：显示每题得分）
  const renderStandingTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          比赛排名
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shouldHideScore && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
              🔒 OI赛制：比赛进行中，分数已封榜，比赛结束后显示
            </p>
          </div>
        )}
        
        {participants.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            暂无参与者
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead className="text-center">总分</TableHead>
                  {problems.map((p, index) => (
                    <TableHead key={p.id} className="text-center min-w-[80px]">
                      {String.fromCharCode(65 + index)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants
                  .slice(0, 50)
                  .map((p, index) => {
                    const rank = index + 1;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-center font-medium">
                          {rank <= 3 ? (
                            <span
                              className={
                                rank === 1
                                  ? "text-yellow-500"
                                  : rank === 2
                                  ? "text-gray-400"
                                  : "text-orange-500"
                              }
                            >
                              {rank}
                            </span>
                          ) : (
                            rank
                          )}
                        </TableCell>
                        <TableCell>
                          {p.users ? (
                            <Link 
                              href={`/profile/${p.users.id}`}
                              className={`hover:underline ${getUserNameColorByRatingAndRole(p.users.rating, p.users.role)}`}
                            >
                              {p.users.username}
                            </Link>
                          ) : (
                            `用户${p.user_id}`
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          {shouldHideScore ? "***" : p.score}
                        </TableCell>
                        {problems.map((prob, probIndex) => {
                          // 从 problem_scores 获取每题得分，或者显示 -
                          const probScore = p.problem_scores?.[String(prob.id)] ?? (shouldHideScore ? "*" : "-");
                          return (
                            <TableCell 
                              key={prob.id} 
                              className="text-center font-mono"
                            >
                              {probScore}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" asChild>
          <Link href="/contests">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回比赛列表
          </Link>
        </Button>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/contests/${contest.id}/edit`}>
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

      {/* 标签页 */}
      {renderTabs()}

      {/* 标签页内容 */}
      {activeTab === "home" && renderHomeTab()}
      {activeTab === "problems" && renderProblemsTab()}
      {activeTab === "standing" && renderStandingTab()}
    </div>
  );
}
