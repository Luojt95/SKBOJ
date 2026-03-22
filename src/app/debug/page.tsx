"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Play, Copy, Trash2, Share2 } from "lucide-react";

const defaultCodes: Record<string, string> = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, SKBOJ!" << endl;
    return 0;
}`,
  python: `# Python 代码示例
print("Hello, SKBOJ!")`,
  html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SKBOJ HTML Demo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        h1 {
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <h1>Hello, SKBOJ!</h1>
</body>
</html>`,
};

export default function DebugPage() {
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(defaultCodes.cpp);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState("");

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(defaultCodes[lang] || "");
    setOutput("");
    setHtmlPreview("");
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast.error("请输入代码");
      return;
    }

    setIsRunning(true);
    setOutput("运行中...");

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, input }),
      });

      const data = await res.json();

      if (language === "html") {
        setHtmlPreview(code);
        setOutput("HTML 已渲染到预览区域");
      } else {
        setOutput(data.output || data.error || "运行完成");
      }
    } catch (error) {
      setOutput("运行失败");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast.success("代码已复制到剪贴板");
  };

  const handleClear = () => {
    setCode("");
    setInput("");
    setOutput("");
    setHtmlPreview("");
  };

  const handleShare = async () => {
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${language.toUpperCase()} 代码分享`,
          code,
          language,
          description: "通过 Debug 页面分享",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("分享成功！");
      } else {
        toast.error(data.error || "分享失败");
      }
    } catch {
      toast.error("请先登录");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">代码调试</h1>
        <p className="text-muted-foreground mt-1">支持 C++、Python、HTML 在线调试</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 代码编辑区 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" />
                  复制
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  清空
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  title="分享代码"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  分享
                </Button>
                <Button
                  size="sm"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  <Play className="h-4 w-4 mr-1" />
                  {isRunning ? "运行中" : "运行"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">代码</label>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono min-h-[400px] text-sm"
                placeholder="在此输入代码..."
                spellCheck={false}
              />
            </div>
            {language !== "html" && (
              <div>
                <label className="text-sm font-medium mb-2 block">输入</label>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="font-mono min-h-[100px] text-sm"
                  placeholder="输入测试数据..."
                  spellCheck={false}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 输出/预览区 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {language === "html" ? "预览" : "输出"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {language === "html" && htmlPreview ? (
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={htmlPreview}
                  className="w-full min-h-[500px] bg-white"
                  title="HTML Preview"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <pre className="bg-muted p-4 rounded-lg font-mono text-sm min-h-[500px] whitespace-pre-wrap overflow-auto">
                {output || "运行结果将显示在这里..."}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 快速示例 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">快速示例</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={language} onValueChange={handleLanguageChange}>
            <TabsList>
              <TabsTrigger value="cpp">C++ 示例</TabsTrigger>
              <TabsTrigger value="python">Python 示例</TabsTrigger>
              <TabsTrigger value="html">HTML 示例</TabsTrigger>
            </TabsList>
            <TabsContent value="cpp" className="mt-4">
              <pre className="bg-muted p-4 rounded-lg font-mono text-sm overflow-auto">
{`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    // 输入示例
    int n;
    cin >> n;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) {
        cin >> arr[i];
    }
    
    // 排序
    sort(arr.begin(), arr.end());
    
    // 输出
    for (int x : arr) {
        cout << x << " ";
    }
    cout << endl;
    
    return 0;
}`}
              </pre>
            </TabsContent>
            <TabsContent value="python" className="mt-4">
              <pre className="bg-muted p-4 rounded-lg font-mono text-sm overflow-auto">
{`# Python 示例：快速排序
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

# 输入
n = int(input())
arr = list(map(int, input().split()))

# 排序并输出
result = quick_sort(arr)
print(' '.join(map(str, result)))`}
              </pre>
            </TabsContent>
            <TabsContent value="html" className="mt-4">
              <pre className="bg-muted p-4 rounded-lg font-mono text-sm overflow-auto">
{`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>SKBOJ Demo</title>
    <style>
        .container {
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>欢迎使用 SKBOJ</h1>
        <p>这是一个简单的 HTML 示例</p>
        <button class="btn" onclick="alert('Hello!')">点击我</button>
    </div>
</body>
</html>`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
