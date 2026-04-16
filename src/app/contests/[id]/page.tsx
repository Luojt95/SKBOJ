"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trophy, Clock, Play, Users, Edit, Trash2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { divConfig } from "@/lib/rating";

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
  users: { id: number; username: string; role: string };
}

interface User {
  id: number;
  username: string;
  role: string;
}

const typeLabels: Record<string, string> = {
  oi: "OI赛制",
  ioi: "IOI赛制",
};

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        // 刷新页面数据
        const data = await res.json();
        setParticipants(data.participants || participants);
      }
    } catch (error) {
      console.error("Join contest error:", error);
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

  // OI赛制下，比赛未结束时不显示分数
  // CS赛制和IOI赛制类似，比赛进行中也能看到分数
  const isOIContest = contest.format === "OI";
  const shouldHideScore = isOIContest && status !== "ended";

  // 检查是否可以编辑/删除
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
        // 刷新页面
        window.location.reload();
      } else {
        toast.error(data.error || data.message || "计算失败");
      }
    } catch {
      toast.error("计算失败");
    }
  };

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

      {/* 比赛信息 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{contest.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {formatLabels[contest.format] || typeLabels[contest.type] || "未知赛制"}
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

              {/* Div 信息 */}
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

              {/* Rating 计算按钮（仅对管理员显示，且 Div.1-3 且比赛已结束且未计算） */}
              {canEdit && contest.div !== "Div.4" && status === "ended" && !contest.rating_calculated && (
                <Button variant="outline" size="sm" onClick={handleCalculateRating}>
                  <Calculator className="h-4 w-4 mr-2" />
                  计算Rating
                </Button>
              )}

              {/* 已计算 Rating 提示 */}
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
            <p className="whitespace-pre-wrap">{contest.description}</p>
          )}
          {contest.format === "CS" && contest.admin_threshold && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>CS赛制：</strong>参赛者在比赛中达到 <strong>{contest.admin_threshold}分</strong> 将自动成为管理员！
              </p>
            </div>
          )}
          {status === "ongoing" && user && !isParticipant && (
            <Button className="mt-4" onClick={handleJoin}>
              <Play className="h-4 w-4 mr-2" />
              参加比赛
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 题目列表 */}
        <div className="lg:col-span-2">
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
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="font-medium">{problem.title}</span>
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
        </div>

        {/* 排行榜 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                排行榜
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  暂无参与者
                </p>
              ) : (
                <>
                  {shouldHideScore && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
                        🔒 OI赛制：比赛进行中，分数已封榜，比赛结束后显示
                      </p>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>用户</TableHead>
                        <TableHead className="text-right">得分</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants
                        .slice(0, 20)
                        .map((p, index) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              {index < 3 ? (
                                <span
                                  className={
                                    index === 0
                                      ? "text-yellow-500"
                                      : index === 1
                                      ? "text-gray-400"
                                      : "text-orange-500"
                                  }
                                >
                                  {index + 1}
                                </span>
                              ) : (
                                index + 1
                              )}
                            </TableCell>
                            <TableCell>
                              {p.users ? (
                                <Link 
                                  href={`/profile/${p.users.id}`}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                >
                                  {p.users.username}
                                </Link>
                              ) : (
                                `用户${p.user_id}`
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {shouldHideScore ? "***" : p.score}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
