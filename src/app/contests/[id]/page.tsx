"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trophy, Clock, Play, Users } from "lucide-react";

interface Contest {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  type: string;
  problem_ids: number[];
  author_id: number;
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
  users: { username: string };
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

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" className="mb-4" asChild>
        <Link href="/contests">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回比赛列表
        </Link>
      </Button>

      {/* 比赛信息 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{contest.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{typeLabels[contest.type]}</Badge>
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
          </div>
        </CardHeader>
        <CardContent>
          {contest.description && (
            <p className="whitespace-pre-wrap">{contest.description}</p>
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
                        {status === "ongoing" && isParticipant && (
                          <Button size="sm" variant="outline">
                            开始作答
                          </Button>
                        )}
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
                      .sort((a, b) => b.score - a.score)
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
                            {(p as any).users?.username || `用户${p.user_id}`}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {p.score}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
