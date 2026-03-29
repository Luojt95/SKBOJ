"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Share2, RefreshCw } from "lucide-react";
import Link from "next/link";

interface CaptchaData {
  token: string;
  image: string;
}

export default function CreateSharePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    language: "cpp",
    description: "",
  });

  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch("/api/captcha");
      if (res.ok) {
        const data = await res.json();
        setCaptcha(data);
        setCaptchaAnswer("");
      }
    } catch {
      toast.error("获取验证码失败");
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        toast.error("请先登录");
        router.push("/login");
      }
    };
    checkAuth();
    fetchCaptcha();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.code.trim()) {
      toast.error("请填写标题和代码");
      return;
    }

    if (!captcha) {
      toast.error("请先获取验证码");
      return;
    }

    if (!captchaAnswer.trim()) {
      toast.error("请输入验证码");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          captchaToken: captcha.token,
          captchaAnswer: captchaAnswer.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("分享成功");
        router.push("/shares");
      } else {
        if (data.error?.includes("验证码")) {
          fetchCaptcha();
        }
        toast.error(data.error || "分享失败");
      }
    } catch {
      toast.error("分享失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" className="mb-4" asChild>
        <Link href="/shares">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回分享列表
        </Link>
      </Button>

      <h1 className="text-3xl font-bold mb-8">分享代码</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>代码信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="请输入标题"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>语言</Label>
              <Select
                value={formData.language}
                onValueChange={(value) =>
                  setFormData({ ...formData, language: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">代码 *</Label>
              <Textarea
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="请粘贴代码"
                className="font-mono min-h-[300px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="简单描述这段代码"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-purple-600"
            disabled={isLoading}
          >
            <Share2 className="h-4 w-4 mr-2" />
            {isLoading ? "分享中..." : "分享代码"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
        </div>
      </form>
    </div>
  );
}
