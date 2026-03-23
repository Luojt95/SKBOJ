"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Code, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

interface Submission {
  id: number;
  problem_id: number;
  language: string;
  status: string;
  score: number;
  time_used: number;
  memory_used: number;
  created_at: string;
  problems: {
    title: string;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ac: { label: "AC", color: "bg-green-500 text-white", icon: CheckCircle },
  wa: { label: "WA", color: "bg-red-500 text-white", icon: XCircle },
  tle: { label: "TLE", color: "bg-yellow-500 text-white", icon: Clock },
  mle: { label: "MLE", color: "bg-orange-500 text-white", icon: AlertTriangle },
  re: { label: "RE", color: "bg-purple-500 text-white", icon: AlertTriangle },
  ce: { label: "CE", color: "bg-gray-500 text-white", icon: XCircle },
  pending: { label: "等待中", color: "bg-blue-500 text-white", icon: Clock },
};

const languageLabels: Record<string, string> = {
  cpp: "C++",
  python: "Python",
  html: "HTML",
};

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await fetch("/api/submissions");
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.submissions || []);
        }
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (kb: number) => {
    if (kb < 1024) return `${kb}KB`;
    return `${(kb / 1024).toFixed(2)}MB`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">加载中...</div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8" />
          提交记录
        </h1>
        <p className="text-muted-foreground mt-1">查看你的所有提交历史</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            历史提交
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无提交记录</p>
              <p className="text-sm mt-2">去题目列表提交你的第一份代码吧！</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">编号</TableHead>
                  <TableHead>题目</TableHead>
                  <TableHead className="w-20">语言</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  <TableHead className="w-20">得分</TableHead>
                  <TableHead className="w-24">用时</TableHead>
                  <TableHead className="w-24">内存</TableHead>
                  <TableHead className="w-40">提交时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => {
                  const status = statusConfig[submission.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  
                  return (
                    <TableRow key={submission.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono">#{submission.id}</TableCell>
                      <TableCell>
                        <Link href={`/problems/${submission.problem_id}`} className="hover:text-primary">
                          <span className="font-medium">{submission.problems?.title || `题目 ${submission.problem_id}`}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{languageLabels[submission.language] || submission.language}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        <span className={submission.score === 100 ? "text-green-600 font-bold" : ""}>
                          {submission.score}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatTime(submission.time_used)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatMemory(submission.memory_used)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(submission.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
