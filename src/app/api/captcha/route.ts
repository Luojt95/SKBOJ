import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

// 简单的内存缓存（生产环境可替换为Redis）
const captchaStore = new Map<string, { answer: string; expires: number }>();

// 定期清理过期验证码
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of captchaStore.entries()) {
    if (value.expires < now) {
      captchaStore.delete(key);
    }
  }
}, 60000); // 每分钟清理一次

// 生成随机三位数（100-999）
function randomThreeDigits(): number {
  return Math.floor(Math.random() * 900) + 100;
}

// 生成SVG验证码图片
function generateCaptchaSvg(num1: number, num2: number): string {
  const expression = `${num1} × ${num2} = ?`;
  
  // 生成干扰线和噪点
  let noiseLines = "";
  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * 200;
    const y1 = Math.random() * 50;
    const x2 = Math.random() * 200;
    const y2 = Math.random() * 50;
    const color = `hsl(${Math.random() * 360}, 50%, 70%)`;
    noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="0.5"/>`;
  }
  
  // 生成噪点
  let noiseDots = "";
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 200;
    const y = Math.random() * 50;
    const color = `hsl(${Math.random() * 360}, 50%, 60%)`;
    noiseDots += `<circle cx="${x}" cy="${y}" r="1" fill="${color}" opacity="0.5"/>`;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="50" viewBox="0 0 200 50">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f0f0f0"/>
          <stop offset="100%" style="stop-color:#e0e0e0"/>
        </linearGradient>
      </defs>
      <rect width="200" height="50" fill="url(#bg)"/>
      ${noiseLines}
      ${noiseDots}
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#333">
        ${expression}
      </text>
    </svg>
  `;
}

export async function GET() {
  try {
    // 生成两个三位数
    const num1 = randomThreeDigits();
    const num2 = randomThreeDigits();
    const answer = (num1 * num2).toString();
    
    // 生成唯一token
    const token = randomBytes(16).toString("hex");
    
    // 存储验证码答案（5分钟有效期）
    captchaStore.set(token, {
      answer,
      expires: Date.now() + 5 * 60 * 1000,
    });
    
    // 生成SVG图片
    const svg = generateCaptchaSvg(num1, num2);
    
    // Base64编码SVG
    const svgBase64 = Buffer.from(svg).toString("base64");
    
    return NextResponse.json({
      token,
      image: `data:image/svg+xml;base64,${svgBase64}`,
    });
  } catch (error) {
    console.error("Generate captcha error:", error);
    return NextResponse.json({ error: "生成验证码失败" }, { status: 500 });
  }
}

// 验证验证码
export function verifyCaptcha(token: string, answer: string): boolean {
  const stored = captchaStore.get(token);
  
  if (!stored) {
    return false;
  }
  
  // 检查是否过期
  if (stored.expires < Date.now()) {
    captchaStore.delete(token);
    return false;
  }
  
  // 验证答案
  const isValid = stored.answer === answer.trim();
  
  // 验证后删除（一次性使用）
  captchaStore.delete(token);
  
  return isValid;
}

// 导出验证函数供其他API使用
export { verifyCaptcha as verifyCaptchaAnswer };
