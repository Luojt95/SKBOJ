import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@vercel/sandbox";

let cachedSandbox: Sandbox | null = null;

async function getSandbox() {
  if (!cachedSandbox) {
    const sandbox = await Sandbox.create();
    await sandbox.runCommand({
      cmd: "dnf",
      args: ["install", "-y", "gcc-c++", "python3"],
      sudo: true,
    });
    cachedSandbox = sandbox;
  }
  return cachedSandbox;
}

export async function POST(request: NextRequest) {
  try {
    const { code, language, input } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "请输入代码" }, { status: 400 });
    }

    const sandbox = await getSandbox();
    let output = "";
    let time = 0;

    if (language === "cpp") {
      await sandbox.runCommand({
        cmd: "bash",
        args: ["-c", `cat > /tmp/code.cpp << 'EOF'\n${code}\nEOF`],
      });

      const compile = await sandbox.runCommand({
        cmd: "g++",
        args: ["/tmp/code.cpp", "-o", "/tmp/program", "-std=c++17", "-O2"],
      });

      if (compile.exitCode !== 0) {
        output = compile.stderr || compile.stdout || "编译错误";
      } else {
        const start = Date.now();
        const run = await sandbox.runCommand({
          cmd: "/tmp/program",
          stdin: input || "",
        });
        time = Date.now() - start;
        
        // 直接取结果，不管它是什么
        output = run.stdout || run.stderr;
        // 如果结果为空，说明用户程序确实没输出，那就显示空
        if (!output) output = "";
      }

    } else if (language === "python") {
      await sandbox.runCommand({
        cmd: "bash",
        args: ["-c", `cat > /tmp/code.py << 'EOF'\n${code}\nEOF`],
      });

      const start = Date.now();
      const run = await sandbox.runCommand({
        cmd: "python3",
        args: ["/tmp/code.py"],
        stdin: input || "",
      });
      time = Date.now() - start;
      output = run.stdout || run.stderr;
      if (!output) output = "";

    } else if (language === "html") {
      output = "HTML代码已在预览区域渲染";
    } else {
      output = "不支持的语言";
    }

    return NextResponse.json({ output, time });
  } catch (error) {
    return NextResponse.json(
      { error: "运行失败: " + (error as Error).message },
      { status: 500 }
    );
  }
}
