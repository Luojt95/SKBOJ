import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCaptchaStore } from "@/lib/captcha";

// 生成随机三位数（100-999）
function randomThreeDigits(): number {
  return Math.floor(Math.random() * 900) + 100;
}

// 生成SVG验证码图片
function generateCaptchaSvg(num1: number, num2: number): string {
  const expression = `${num1} × ${num2} = ?`;
  
  let noiseLines = "";
  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * 200;
    const y1 = Math.random() * 50;
    const x2 = Math.random() * 200;
    const y2 = Math.random() * 50;
    const color = `hsl(${Math.random() * 360}, 50%, 70%)`;
    noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="0.5"/>`;
  }
  
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
    const num1 = randomThreeDigits();
    const num2 = randomThreeDigits();
    const answer = (num1 * num2).toString();
    
    const token = randomBytes(16).toString("hex");
    
    const captchaStore = getCaptchaStore();
    captchaStore.set(token, {
      answer,
      expires: Date.now() + 5 * 60 * 1000,
    });
    
    const svg = generateCaptchaSvg(num1, num2);
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
