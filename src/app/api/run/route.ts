import { NextRequest, NextResponse } from "next/server";

const JUDGE0_URL = "https://ce.judge0.com";

export async function POST(request: NextRequest) {
  try {
    const { code, language, input } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "请输入代码" }, { status: 400 });
    }

    // 语言映射
    const languageMap: Record<string, number> = {
      cpp: 54,   // C++ (GCC 9.2.0)
      python: 71, // Python 3.9.1
    };

    const languageId = languageMap[language];
    if (!languageId) {
      return NextResponse.json({ output: "不支持的语言" }, { status: 400 });
    }

    // 调用 Judge0 API
    const response = await fetch(`${JUDGE0_URL}/submissions?wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: input || "",
      }),
    });

    const result = await response.json();

    // 提取输出
    let output = "";
    if (result.stdout) output += result.stdout;
    if (result.stderr) output += (output ? "\n" : "") + result.stderr;
    if (result.compile_output) output += (output ? "\n" : "") + "编译: " + result.compile_output;
    if (!output) output = "(无输出)";

    return NextResponse.json({
      output: output,
      time: result.time ? parseFloat(result.time) * 1000 : 0,
      memory: result.memory || 0,
    });
  } catch (error) {
    console.error("Run code error:", error);
    return NextResponse.json(
      { error: "运行失败: " + (error as Error).message },
      { status: 500 }
    );
  }
}
