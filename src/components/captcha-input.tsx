"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";

interface CaptchaData {
  token: string;
  image: string;
}

interface CaptchaInputProps {
  value: string;
  onChange: (value: string) => void;
  onTokenChange: (token: string) => void;
}

export function CaptchaInput({ value, onChange, onTokenChange }: CaptchaInputProps) {
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCaptcha = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/captcha");
      if (res.ok) {
        const data = await res.json();
        setCaptcha(data);
        onTokenChange(data.token);
        onChange("");
      }
    } catch {
      console.error("获取验证码失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  return (
    <div className="space-y-2">
      <Label>验证码</Label>
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
            <div className="w-[120px] h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
              加载中...
            </div>
          )}
        </div>
        <Input
          type="text"
          placeholder="输入计算结果"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
          autoComplete="off"
          required
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={fetchCaptcha}
          disabled={isLoading}
          title="刷新验证码"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        请计算图中乘法结果，点击图片可刷新
      </p>
    </div>
  );
}
