import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Code, Trophy, Users, Zap, BookOpen, Rocket } from "lucide-react";

const features = [
  {
    icon: Code,
    title: "丰富题库",
    description: "涵盖入门到进阶的算法题目，支持多种难度标签筛选",
  },
  {
    icon: Trophy,
    title: "在线比赛",
    description: "支持OI/IOI赛制，实时排行榜，体验竞技乐趣",
  },
  {
    icon: Users,
    title: "社区交流",
    description: "讨论区互动，题解分享，共同进步",
  },
  {
    icon: Zap,
    title: "即时评测",
    description: "支持C++、Python、HTML代码在线调试，快速反馈",
  },
  {
    icon: BookOpen,
    title: "题解系统",
    description: "查看优质题解，学习解题思路和技巧",
  },
  {
    icon: Rocket,
    title: "代码分享",
    description: "分享你的代码作品，与OIer们交流学习",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,transparent,black)] dark:bg-grid-slate-700/25" />
        <div className="container mx-auto px-4 py-24 lg:py-32 relative">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="currentColor">
                <path d="M12 4C6 4 2 9 2 12s4 8 10 8c1 0 2-.5 2-.5 3 2 6 1 6 1s-2-2-2-4c0 0 4-2 4-4.5S16 4 12 4zM7 11c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
              </svg>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              欢迎来到{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SKBOJ
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
              OIer的乐土
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link href="/problems">开始刷题</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register">注册账号</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">平台功能</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              SKBOJ 提供全方位的算法竞赛支持，助你在OI之路上更进一步
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
