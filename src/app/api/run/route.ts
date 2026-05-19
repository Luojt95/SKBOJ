import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@vercel/sandbox";

// 创建一个共享的沙箱实例
let cachedSandbox: Sandbox | null = null;

async function getSandbox() {
  if (!cachedSandbox) {
    const sandbox = await Sandbox.create();
    
    // 安装 g++ 和 python3
    await sandbox.runCommand({
      cmd: "dnf",
      args: ["install", "-y", "gcc-c++", "python3"],
      sudo: true,
    });
    
    cachedSandbox = sandbox;
  }
  return cachedSandbox;
}

// 通过命令写入文件
async function writeFile(sandbox: Sandbox, path: string, content: string) {
  // 转义单引号和特殊字符
  const escaped = content.replace(/'/g, "'\\''");
  await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", `echo '${escaped}' > ${path}`],
  });
}

// 执行C++代码
async function runCpp(code: string, input: string): Promise<{ output: string; time: number; memory: number }> {
  const sandbox = await getSandbox();
  const startTime = Date.now();
  
  try {
    // 写入源代码
    await writeFile(sandbox, "/tmp/code.cpp", code);
    
    // 编译
    const compileResult = await sandbox.runCommand({
      cmd: "g++",
      args: ["/tmp/code.cpp", "-o", "/tmp/program", "-std=c++17", "-O2"],
    });
    
    if (compileResult.exitCode !== 0) {
      return { 
        output: `编译错误:\n${compileResult.stderr || compileResult.stdout}`, 
        time: Date.now() - startTime, 
        memory: 0 
      };
    }
    
    // 运行
    const runResult = await sandbox.runCommand({
      cmd: "/tmp/program",
      args: [],
      stdin: input || "",
    });
    
    return { 
      output: runResult.stdout || "程序执行完毕（无输出）", 
      time: Date.now() - startTime,
      memory: 0 
    };
  } catch (error) {
    return { 
      output: `执行错误: ${(error as Error).message}`, 
      time: Date.now() - startTime, 
      memory: 0 
    };
  }
}

// 执行Python代码
async function runPython(code: string, input: string): Promise<{ output: string; time: number; memory: number }> {
  const sandbox = await getSandbox();
  const startTime = Date.now();
  
  try {
    await writeFile(sandbox, "/tmp/code.py", code);
    
    const runResult = await sandbox.runCommand({
      cmd: "python3",
      args: ["/tmp/code.py"],
      stdin: input || "",
    });
    
    return { 
      output: runResult.stdout || "程序执行完毕（无输出）", 
      time: Date.now() - startTime,
      memory: 0 
    };
  } catch (error) {
    return { 
      output: `执行错误: ${(error as Error).message}`, 
      time: Date.now() - startTime, 
      memory: 0 
    };
  }
}

// HTML代码处理
function processHtml(code: string): { output: string; time: number; memory: number } {
  return { output: "HTML代码已在预览区域渲染", time: 0, memory: 0 };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, input } = body;

    if (!code) {
      return NextResponse.json({ error: "请输入代码" }, { status: 400 });
    }

    let result: { output: string; time: number; memory: number };

    switch (language) {
      case "cpp":
        result = await runCpp(code, input || "");
        break;
      case "python":
        result = await runPython(code, input || "");
        break;
      case "html":
        result = processHtml(code);
        break;
      default:
        result = { output: "不支持的语言", time: 0, memory: 0 };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Run code error:", error);
    return NextResponse.json({ error: "运行失败: " + (error as Error).message }, { status: 500 });
  }
}
