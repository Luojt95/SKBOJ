"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Clock, Users } from "lucide-react";

interface Contest {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  type: string;
  author_id: number;
  is_visible: boolean;
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

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-500",
  ongoing: "bg-green-500",
  ended: "bg-gray-500",
};

const statusLabels: Record<string, string> = {
  upcoming: "未开始",
  ongoing: "进行中",
  ended: "已结束",
};

function getContestStatus(startTime: string, endTime: string): string {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "ongoing";
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString("zh-CN");
}

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contestsRes, userRes] = await Promise.all([
          fetch("/api/contests"),
          fetch("/api/auth/me"),
        ]);

        if (contestsRes.ok) {
          const data = await contestsRes.json();
          setContests(data.contests || []);
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
  }, []);

  const canCreateContest = user && (user.role === "admin" || user.role === "super_admin");

  // 按状态分组
  const groupedContests = {
    ongoing: contests.filter((c) => getContestStatus(c.start_time, c.end_time) === "ongoing"),
    upcoming: contests.filter((c) => getContestStatus(c.start_time, c.end_time) === "upcoming"),
    ended: contests.filter((c) => getContestStatus(c.start_time, c.end_time) === "ended"),
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">比赛列表</h1>
          <p className="text-muted-foreground mt-1">参与在线比赛，挑战自我</p>
        </div>
        {canCreateContest && (
          <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Link href="/contests/create">
              <Plus className="h-4 w-4 mr-2" />
              创建比赛
            </Link>
          </Button>
        )}
      </div>

      {/* 进行中的比赛 */}
      {groupedContests.ongoing.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-500" />
            进行中
          </h2>
          <div className="grid gap-4">
            {groupedContests.ongoing.map((contest) => (
              <Link key={contest.id} href={`/contests/${contest.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{contest.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            结束于 {formatTime(contest.end_time)}
                          </span>
                          <Badge variant="outline">{typeLabels[contest.type]}</Badge>
                        </div>
                      </div>
                      <Badge className={`${statusColors.ongoing} text-white`}>
                        {statusLabels.ongoing}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 即将开始的比赛 */}
      {groupedContests.upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            即将开始
          </h2>
          <div className="grid gap-4">
            {groupedContests.upcoming.map((contest) => (
              <Link key={contest.id} href={`/contests/${contest.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{contest.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            开始于 {formatTime(contest.start_time)}
                          </span>
                          <Badge variant="outline">{typeLabels[contest.type]}</Badge>
                        </div>
                      </div>
                      <Badge className={`${statusColors.upcoming} text-white`}>
                        {statusLabels.upcoming}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 已结束的比赛 */}
      {groupedContests.ended.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            已结束
          </h2>
          <div className="grid gap-4">
            {groupedContests.ended.map((contest) => (
              <Link key={contest.id} href={`/contests/${contest.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-gray-500">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{contest.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(contest.start_time)} - {formatTime(contest.end_time)}
                          </span>
                          <Badge variant="outline">{typeLabels[contest.type]}</Badge>
                        </div>
                      </div>
                      <Badge className={`${statusColors.ended} text-white`}>
                        {statusLabels.ended}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {contests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无比赛</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
