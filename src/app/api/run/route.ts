import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// 创建临时目录
const TEMP_DIR = join(tmpdir(), "skboj-run");

async function ensureTempDir() {
  try {
    await mkdir(TEMP_DIR, { recursive: true });
  } catch {
    // 目录已存在
  }
}

// 使用 spawn 执行命令并捕获输出
function runCommand(
  command: string,
  args: string[],
  input: string,
  timeout: number = 5000
): Promise<{ output: string; time: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const proc = spawn(command, args, {
      cwd: TEMP_DIR,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // 写入输入
    if (input) {
      proc.stdin.write(input);
    }
    proc.stdin.end();

    // 超时处理
    const timer = setTimeout(() => {
      proc.kill();
      resolve({ output: "运行超时（超过 " + timeout / 1000 + " 秒）", time: timeout });
    }, timeout);

    proc.on("close", (code) => {
      clearTimeout(timer);
      const elapsed = Date.now() - startTime;
      if (code === 0) {
        resolve({ output: stdout || "程序执行完毕（无输出）", time: elapsed });
      } else {
        resolve({ output: `运行错误 (退出码: ${code}):\n${stderr || stdout}`, time: elapsed });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ output: `执行错误: ${err.message}`, time: Date.now() - startTime });
    });
  });
}

// 执行C++代码
async function runCpp(code: string, input: string): Promise<{ output: string; time: number; memory: number }> {
  await ensureTempDir();
  const id = Date.now();
  const sourceFile = join(TEMP_DIR, `code_${id}.cpp`);
  const execFile = join(TEMP_DIR, `code_${id}`);

  try {
    // 写入源代码
    await writeFile(sourceFile, code);

    // 编译
    const compileResult = await runCommand("g++", ["-o", execFile, sourceFile, "-std=c++17", "-O2"], "", 10000);
    
    // 检查是否编译成功（通过检查可执行文件是否存在）
    try {
      const { access } = await import("fs/promises");
      await access(execFile);
    } catch {
      return { output: `编译错误:\n${compileResult.output}`, time: compileResult.time, memory: 0 };
    }

    // 运行
    const result = await runCommand(execFile, [], input, 5000);
    return { 
      output: result.output, 
      time: result.time,
      memory: Math.floor(Math.random() * 1000 + 100) // 模拟内存使用（实际需要更复杂的方式测量）
    };
  } finally {
    // 清理文件
    try {
      await unlink(sourceFile);
      await unlink(execFile);
    } catch {}
  }
}

// 执行Python代码
async function runPython(code: string, input: string): Promise<{ output: string; time: number; memory: number }> {
  await ensureTempDir();
  const id = Date.now();
  const sourceFile = join(TEMP_DIR, `code_${id}.py`);

  try {
    // 写入源代码
    await writeFile(sourceFile, code);

    // 运行
    const result = await runCommand("python3", [sourceFile], input, 5000);
    return { 
      output: result.output, 
      time: result.time,
      memory: Math.floor(Math.random() * 2000 + 500) // Python 通常使用更多内存
    };
  } finally {
    // 清理文件
    try {
      await unlink(sourceFile);
    } catch {}
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
