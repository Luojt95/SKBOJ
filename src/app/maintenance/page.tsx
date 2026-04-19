import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Code, Trophy, Bug, Users, MessageSquare, HelpCircle, AlertCircle } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">SKBOJ 维护中</h1>
        <p className="text-muted-foreground text-lg">数据库连接暂时不可用，我们正在修复中</p>
      </div>

      <Card className="mb-8 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-5 w-5" />
            系统公告
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-900 dark:text-amber-100">
          <p className="mb-2">
            SKBOJ 目前正在进行数据库维护，部分功能可能暂时无法使用。
          </p>
          <p className="text-sm opacity-80">
            预计恢复时间：请稍后访问
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              在线评测
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              支持多种编程语言的在线评测系统
            </p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">C++</Badge>
              <Badge variant="secondary">Python</Badge>
              <Badge variant="secondary">Java</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              在线比赛
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              参加定期举办的算法竞赛
            </p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">OI赛制</Badge>
              <Badge variant="secondary">IOI赛制</Badge>
              <Badge variant="secondary">CS赛制</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              代码调试
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              在线编写、运行和调试代码
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              社区交流
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              与其他 OIer 交流学习
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            帮助中心
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">SKBOJ 使用指南</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• 浏览题目列表，选择感兴趣的题目进行练习</p>
                <p>• 支持多种编程语言（C++、Python等）</p>
                <p>• 实时评测，获取详细的测试结果</p>
                <p>• 参加比赛，与其他选手同台竞技</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Rating 系统</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• 通过比赛获得 Rating</p>
                <p>• Rating 决定用户等级和名称颜色</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button asChild>
          <Link href="/login">
            前往登录
          </Link>
        </Button>
      </div>
    </div>
  );
}
