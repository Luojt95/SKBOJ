import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@vercel/sandbox";

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

async function writeFile(sandbox: Sandbox, path: string, content: string) {
  // 使用 heredoc 方式写入，支持多行和特殊字符
  await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", `cat > ${path} << 'EOFCODE'\n${content}\nEOFCODE`],
  });
}

async function runCpp(code: string, input: string) {
  const sandbox = await getSandbox();
  const startTime = Date.now();
  
  try {
    await writeFile(sandbox, "/tmp/code.cpp", code);
    
    // 编译
    const compile = await sandbox.runCommand({
      cmd: "g++",
      args: ["/tmp/code.cpp", "-o", "/tmp/program", "-std=c++17", "-O2"],
    });
    
    if (compile.exitCode !== 0) {
      return {
        output: compile.stderr || compile.stdout || "编译错误",
        time: Date.now() - startTime,
      };
    }
    
    // 运行
    const run = await sandbox.runCommand({
      cmd: "/tmp/program",
      stdin: input || "",
    });
    
    return {
      output: run.stdout || run.stderr || "(无输出)",
      time: Date.now() - startTime,
    };
  } catch (err) {
    return {
      output: "执行错误: " + (err as Error).message,
      time: Date.now() - startTime,
    };
  }
}

async function runPython(code: string, input: string) {
  const sandbox = await getSandbox();
  const startTime = Date.now();
  
  try {
    await writeFile(sandbox, "/tmp/code.py", code);
    
    const run = await sandbox.runCommand({
      cmd: "python3",
      args: ["/tmp/code.py"],
      stdin: input || "",
    });
    
    return {
      output: run.stdout || run.stderr || "(无输出)",
      time: Date.now() - startTime,
    };
  } catch (err) {
    return {
      output: "执行错误: " + (err as Error).message,
      time: Date.now() - startTime,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code, language, input } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "请输入代码" }, { status: 400 });
    }

    let result;

    switch (language) {
      case "cpp":
        result = await runCpp(code, input || "");
        break;
      case "python":
        result = await runPython(code, input || "");
        break;
      case "html":
        result = { output: "HTML 代码已在预览区域渲染", time: 0 };
        break;
      default:
        result = { output: "不支持的语言", time: 0 };
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Run code error:", err);
    return NextResponse.json(
      { error: "运行失败: " + (err as Error).message },
      { status: 500 }
    );
  }
}
