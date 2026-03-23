import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";
import AdmZip from "adm-zip";

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const problemId = formData.get("problemId") as string;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json({ error: "只支持ZIP文件" }, { status: 400 });
    }

    // 读取ZIP文件内容
    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    const testCases: Array<{ input: string; output: string; inputKey: string; outputKey: string }> = [];
    const inputFiles: Map<string, AdmZip.IZipEntry> = new Map();
    const outputFiles: Map<string, AdmZip.IZipEntry> = new Map();

    // 遍历ZIP文件，找出所有.in和.out文件
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      
      const name = entry.entryName;
      const baseName = name.replace(/\.(in|out)$/i, "");
      
      if (name.toLowerCase().endsWith(".in")) {
        inputFiles.set(baseName, entry);
      } else if (name.toLowerCase().endsWith(".out")) {
        outputFiles.set(baseName, entry);
      }
    }

    // 匹配输入输出文件对
    const prefix = problemId ? `problems/${problemId}/testdata` : `problems/temp/${Date.now()}/testdata`;

    for (const [baseName, inputEntry] of inputFiles) {
      const outputEntry = outputFiles.get(baseName);
      if (!outputEntry) continue;

      const inputData = inputEntry.getData().toString("utf-8");
      const outputData = outputEntry.getData().toString("utf-8");

      // 上传输入文件到对象存储
      const inputKey = await storage.uploadFile({
        fileContent: inputEntry.getData(),
        fileName: `${prefix}/${baseName}.in`,
        contentType: "text/plain",
      });

      // 上传输出文件到对象存储
      const outputKey = await storage.uploadFile({
        fileContent: outputEntry.getData(),
        fileName: `${prefix}/${baseName}.out`,
        contentType: "text/plain",
      });

      testCases.push({
        input: inputData,
        output: outputData,
        inputKey,
        outputKey,
      });
    }

    if (testCases.length === 0) {
      return NextResponse.json({ 
        error: "未找到有效的测试数据文件，请确保ZIP中包含成对的.in和.out文件" 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      testCases,
      message: `成功导入 ${testCases.length} 个测试点`,
    });
  } catch (error) {
    console.error("Upload testdata error:", error);
    return NextResponse.json({ 
      error: "上传失败: " + (error as Error).message 
    }, { status: 500 });
  }
}
