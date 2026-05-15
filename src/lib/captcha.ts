// 验证码存储（与 captcha route 共享）
const captchaStore = new Map<string, { answer: string; expires: number }>();

// 定期清理过期验证码
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of captchaStore.entries()) {
      if (value.expires < now) {
        captchaStore.delete(key);
      }
    }
  }, 60000);
}

export function getCaptchaStore() {
  return captchaStore;
}

export function verifyCaptchaAnswer(token: string, answer: string): boolean {
  const stored = captchaStore.get(token);
  
  if (!stored) {
    return false;
  }
  
  if (stored.expires < Date.now()) {
    captchaStore.delete(token);
    return false;
  }
  
  const isValid = stored.answer === answer.trim();
  captchaStore.delete(token);
  
  return isValid;
}
