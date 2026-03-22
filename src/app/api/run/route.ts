import { NextRequest, NextResponse } from "next/server";

// 简单的代码运行模拟（实际项目中应该使用沙箱环境）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, input } = body;

    if (!code) {
      return NextResponse.json({ error: "请输入代码" }, { status: 400 });
    }

    // 模拟运行结果
    // 实际项目中应该使用安全的沙箱环境执行代码
    let output = "";

    switch (language) {
      case "cpp":
        output = simulateCppExecution(code, input);
        break;
      case "python":
        output = simulatePythonExecution(code, input);
        break;
      case "html":
        output = "HTML代码已在预览中渲染";
        break;
      default:
        output = "不支持的语言";
    }

    return NextResponse.json({ output });
  } catch (error) {
    console.error("Run code error:", error);
    return NextResponse.json({ error: "运行失败" }, { status: 500 });
  }
}

function simulateCppExecution(code: string, input: string): string {
  // 简单模拟 - 实际应该用沙箱
  if (code.includes("cout") || code.includes("printf")) {
    return `编译成功\n运行结果:\n${input ? `输入: ${input}\n` : ""}Hello, SKBOJ!`;
  }
  return `编译成功\n程序执行完毕`;
}

function simulatePythonExecution(code: string, input: string): string {
  // 简单模拟 - 实际应该用沙箱
  if (code.includes("print")) {
    return `运行结果:\n${input ? `输入: ${input}\n` : ""}Hello, SKBOJ!`;
  }
  return `程序执行完毕`;
}
