"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, RefreshCw } from "lucide-react";

interface CaptchaData {
  token: string;
  image: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    captchaAnswer: "",
  });

  // 获取验证码
  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch("/api/captcha");
      if (res.ok) {
        const data = await res.json();
        setCaptcha(data);
        setFormData(prev => ({ ...prev, captchaAnswer: "" }));
      }
    } catch {
      toast.error("获取验证码失败");
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("两次密码输入不一致");
      return;
    }

    if (!captcha) {
      toast.error("请先获取验证码");
      return;
    }

    if (!formData.captchaAnswer) {
      toast.error("请输入验证码");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          captchaToken: captcha.token,
          captchaAnswer: formData.captchaAnswer,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("注册成功，请登录");
        router.push("/login");
      } else {
        // 如果验证码错误，刷新验证码
        if (data.error?.includes("验证码")) {
          fetchCaptcha();
        }
        toast.error(data.error || "注册失败");
      }
    } catch {
      toast.error("注册失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">注册</CardTitle>
          <CardDescription>创建 SKBOJ 账号</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="3-50个字符"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
                minLength={3}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="至少6个字符"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
              />
            </div>
            
            {/* 验证码 */}
            <div className="space-y-2">
              <Label htmlFor="captcha">验证码</Label>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {captcha ? (
                    <img
                      src={captcha.image}
                      alt="验证码"
                      className="h-10 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={fetchCaptcha}
                      title="点击刷新"
                    />
                  ) : (
                    <div className="w-[160px] h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                      加载中...
                    </div>
                  )}
                </div>
                <Input
                  id="captcha"
                  type="text"
                  placeholder="输入计算结果"
                  value={formData.captchaAnswer}
                  onChange={(e) =>
                    setFormData({ ...formData, captchaAnswer: e.target.value })
                  }
                  required
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={fetchCaptcha}
                  disabled={captchaLoading}
                  title="刷新验证码"
                >
                  <RefreshCw className={`h-4 w-4 ${captchaLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                请计算图中乘法结果，点击图片可刷新
              </p>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? "注册中..." : "注册"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            已有账号？{" "}
            <Link href="/login" className="text-primary hover:underline">
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
