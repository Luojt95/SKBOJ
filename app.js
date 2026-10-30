const db = supabase.createClient(
  'https://dqkwsxmungraspslqeic.supabase.co', 
  'sb_publishable_NOkN05poycZPEKgeeQz7pQ__tPR-yST'
);
// ==========================================
// 辅助数学与算法函数
// ==========================================
function getFreq(x) {
  const s = String(x), freq = {};
  for (const c of s) freq[c] = (freq[c] || 0) + 1;
  return freq;
}
function sumFreqDiv(x, div) {
  return Object.values(getFreq(x)).reduce((sum, c) => sum + Math.floor(c / div), 0);
}
function hasKSubstr(s, len, k) {
  for (let i = 0; i <= s.length - len; i++) {
    let sub = s.slice(i, i + len), curr = i, cnt = 1;
    while (cnt < k) {
      let next = s.indexOf(sub, curr + len);
      if (next === -1) break;
      curr = next; cnt++;
    }
    if (cnt === k) return true;
  }
  return false;
}
function getLIS(x) {
  const s = String(x), n = s.length;
  if (n === 0) return 0;
  const dp = new Array(n).fill(1);
  let max = 1;
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (+s[i] > +s[j]) dp[i] = Math.max(dp[i], dp[j] + 1);
    }
    max = Math.max(max, dp[i]);
  }
  return max;
}
function getLDS(x) {
  const s = String(x), n = s.length;
  if (n === 0) return 0;
  const dp = new Array(n).fill(1);
  let max = 1;
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (+s[i] < +s[j]) dp[i] = Math.max(dp[i], dp[j] + 1);
    }
    max = Math.max(max, dp[i]);
  }
  return max;
}
function getLPS(x) {
  const s = String(x);
  let max = 0;
  for (let i = 1; i < s.length; i++) {
    if (s.slice(0, i) === s.slice(s.length - i)) max = Math.max(max, i);
  }
  return max;
}
function isPrime(x) {
  if (x < 2) return false;
  for (let i = 2; i * i <= x; i++) if (x % i === 0) return false;
  return true;
}
function isSquare(x) { return Number.isInteger(Math.sqrt(x)); }
function isPerfectPower(x, p) {
  if (x < 0) return false;
  if (x === 0 || x === 1) return true;
  const r = Math.round(Math.pow(x, 1 / p));
  for (let k = Math.max(2, r - 2); k <= r + 2; k++) {
    let v = 1;
    for (let i = 0; i < p; i++) v *= k;
    if (v === x) return true;
  }
  return false;
}
function isPowerOfBase(x, base) {
  if (x < 1) return false;
  let v = 1;
  while (v < x) v *= base;
  return v === x;
}
function isSemiPrime(x) {
  if (x < 4) return false;
  let cnt = 0;
  for (let i = 2; i * i <= x; i++) {
    while (x % i === 0) { cnt++; x /= i; if (cnt > 2) return false; }
  }
  if (x > 1) cnt++;
  return cnt === 2;
}
function sumProperDivisors(n) {
  if (n === 1) return 0;
  let sum = 1;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) {
      sum += i;
      if (i * i !== n) sum += n / i;
    }
  }
  return sum;
}

// ==========================================
// 荣誉表 (严格按照你的要求)
// ==========================================
const FEATURES = [
  // 位数
  { name: '一位数', condition: '只有一位', rp: 987654321, check: x => String(x).length === 1 },
  { name: '两位数', condition: '包含两位', rp: 87654321, check: x => String(x).length === 2 },
  { name: '三位数', condition: '包含三位', rp: 7654321, check: x => String(x).length === 3 },
  { name: '四位数', condition: '包含四位', rp: 654321, check: x => String(x).length === 4 },
  { name: '五位数', condition: '包含五位', rp: 54321, check: x => String(x).length === 5 },
  { name: '六位数', condition: '包含六位', rp: 4321, check: x => String(x).length === 6 },
  { name: '七位数', condition: '包含七位', rp: 321, check: x => String(x).length === 7 },
  { name: '八位数', condition: '包含八位', rp: 21, check: x => String(x).length === 8 },
  // 特殊包含
  { name: '报警', condition: '包含"110"', rp: 1100, check: x => String(x).includes('110') },
  { name: '火灾', condition: '包含"119"', rp: 1190, check: x => String(x).includes('119') },
  { name: 'SOS', condition: '包含"120"', rp: 1200, check: x => String(x).includes('120') },
  { name: '666', condition: '包含"666"', rp: 2000, check: x => String(x).includes('666') },
  { name: '888', condition: '包含"888"', rp: 3000, check: x => String(x).includes('888') },
  { name: '123', condition: '包含"123"', rp: 1230, check: x => String(x).includes('123') },
  { name: '250', condition: '包含"250"', rp: 2500, check: x => String(x).includes('250') },
  { name: '勾八', condition: '包含"78"或"91"', rp: 670, check: x => String(x).includes('78') || String(x).includes('91') },
  { name: '114514', condition: '包含"114514"', rp: 1145140, check: x => String(x).includes('114514') },
  { name: '1919810', condition: '包含"1919810"', rp: 19198100, check: x => String(x).includes('1919810') },
  { name: '走马灯', condition: '包含"142857"', rp: 1428570, check: x => String(x).includes('142857') },
  { name: '54188', condition: '包含"54188"', rp: 199990, check: x => String(x).includes('54188') },
  { name: '14524', condition: '包含"14524"', rp: 166660, check: x => String(x).includes('14524') },
  // 幂次方
  { name: '平方', condition: 'n^2', rp: 22222222, check: x => isPerfectPower(x, 2) },
  { name: '立方', condition: 'n^3', rp: 33333333, check: x => isPerfectPower(x, 3) },
  { name: '五次方', condition: 'n^5', rp: 55555555, check: x => isPerfectPower(x, 5) },
  { name: '七次方', condition: 'n^7', rp: 77777777, check: x => isPerfectPower(x, 7) },
  { name: '十一次方', condition: 'n^11', rp: 111111111, check: x => isPerfectPower(x, 11) },
  { name: '十三次方', condition: 'n^13', rp: 133333333, check: x => isPerfectPower(x, 13) },
  { name: '十七次方', condition: 'n^17', rp: 177777777, check: x => isPerfectPower(x, 17) },
  { name: '十九次方', condition: 'n^19', rp: 199999999, check: x => isPerfectPower(x, 19) },
  { name: '二十三次方', condition: 'n^23', rp: 233333333, check: x => isPerfectPower(x, 23) },
  { name: '二十九次方', condition: 'n^29', rp: 299999999, check: x => isPerfectPower(x, 29) },
  { name: '三十一次方', condition: 'n^31', rp: 311111111, check: x => isPerfectPower(x, 31) },
  { name: '三十七次方', condition: 'n^37', rp: 377777777, check: x => isPerfectPower(x, 37) },
  { name: '2的幂', condition: '2的整数次幂', rp: 222222222, check: x => isPowerOfBase(x, 2) },
  { name: '3的幂', condition: '3的整数次幂', rp: 333333333, check: x => isPowerOfBase(x, 3) },
  { name: '5的幂', condition: '5的整数次幂', rp: 444444444, check: x => isPowerOfBase(x, 5) },
  { name: '7的幂', condition: '7的整数次幂', rp: 555555555, check: x => isPowerOfBase(x, 7) },
  { name: '11的幂', condition: '11的整数次幂', rp: 666666666, check: x => isPowerOfBase(x, 11) },
  { name: '13的幂', condition: '13的整数次幂', rp: 777777777, check: x => isPowerOfBase(x, 13) },
  { name: '17的幂', condition: '17的整数次幂', rp: 888888888, check: x => isPowerOfBase(x, 17) },
  { name: '19的幂', condition: '19的整数次幂', rp: 999999999, check: x => isPowerOfBase(x, 19) },
  // 不等式组 (组合数字)
  { name: '一元八次不等式', condition: '有八个数字且全部不同', rp: 800000, check: x => String(x).length === 8 && new Set(String(x)).size === 8 },
  { name: '二元一次不等式组', condition: '包含两个相同的数', rp: 30, check: x => sumFreqDiv(x, 2) >= 1 },
  { name: '二元二次不等式组', condition: '包含两对相同的数', rp: 400, check: x => sumFreqDiv(x, 2) >= 2 },
  { name: '二元三次不等式组', condition: '包含三对相同的数', rp: 60000, check: x => sumFreqDiv(x, 2) >= 3 },
  { name: '二元四次不等式组', condition: '包含四对相同的数', rp: 9000000, check: x => sumFreqDiv(x, 2) >= 4 },
  { name: '三元一次不等式组', condition: '包含三个相同的数', rp: 300, check: x => sumFreqDiv(x, 3) >= 1 },
  { name: '三元二次不等式组', condition: '包含两组三个相同的数', rp: 600000, check: x => sumFreqDiv(x, 3) >= 2 },
  { name: '四元一次不等式组', condition: '包含四个相同的数', rp: 40000, check: x => sumFreqDiv(x, 4) >= 1 },
  { name: '四元二次不等式组', condition: '包含两组四个相同的数', rp: 100000000, check: x => sumFreqDiv(x, 4) >= 2 },
  { name: '五元一次不等式组', condition: '包含五个相同的数', rp: 500000, check: x => sumFreqDiv(x, 5) >= 1 },
  { name: '六元一次不等式组', condition: '包含六个相同的数', rp: 4000000, check: x => sumFreqDiv(x, 6) >= 1 },
  { name: '七元一次不等式组', condition: '包含七个相同的数', rp: 30000000, check: x => sumFreqDiv(x, 7) >= 1 },
  { name: '八元一次不等式组', condition: '包含八个相同的数', rp: 200000000, check: x => sumFreqDiv(x, 8) >= 1 },
  // 方程组 (包含不重叠子串)
  { name: '二元二次方程组', condition: '包含两个相同的长为二的子串且不重', rp: 500, check: x => hasKSubstr(String(x), 2, 2) },
  { name: '二元三次方程组', condition: '包含三个相同的长为二的子串且不重', rp: 90000, check: x => hasKSubstr(String(x), 2, 3) },
  { name: '二元四次方程组', condition: '包含四个相同的长为二的子串且不重', rp: 20000000, check: x => hasKSubstr(String(x), 2, 4) },
  { name: '三元二次方程组', condition: '包含两个相同的长为三的子串且不重', rp: 80000, check: x => hasKSubstr(String(x), 3, 2) },
  { name: '四元二次方程组', condition: '包含两个相同的长为三的子串且不重', rp: 500000, check: x => hasKSubstr(String(x), 3, 2) }, // 依照你的原文本
  // 子序列
  { name: 'LIS8', condition: '最长上升子序列为 8', rp: 123456789, check: x => getLIS(x) === 8 },
  { name: 'LIS7', condition: '最长上升子序列为 7', rp: 1234567, check: x => getLIS(x) === 7 },
  { name: 'LIS6', condition: '最长上升子序列为 6', rp: 12345, check: x => getLIS(x) === 6 },
  { name: 'LIS5', condition: '最长上升子序列为 5', rp: 1234, check: x => getLIS(x) === 5 },
  { name: 'LDS8', condition: '最长下降子序列为 8', rp: 123456789, check: x => getLDS(x) === 8 },
  { name: 'LDS7', condition: '最长下降子序列为 7', rp: 1234567, check: x => getLDS(x) === 7 },
  { name: 'LDS6', condition: '最长下降子序列为 6', rp: 12345, check: x => getLDS(x) === 6 },
  { name: 'LDS5', condition: '最长下降子序列为 5', rp: 1234, check: x => getLDS(x) === 5 },
  // 公共前后缀
  { name: 'LPS7', condition: '最长公共前后缀为 7', rp: 123456789, check: x => getLPS(x) === 7 },
  { name: 'LPS6', condition: '最长公共前后缀为 6', rp: 12345678, check: x => getLPS(x) === 6 },
  { name: 'LPS5', condition: '最长公共前后缀为 5', rp: 1234567, check: x => getLPS(x) === 5 },
  { name: 'LPS4', condition: '最长公共前后缀为 4', rp: 123456, check: x => getLPS(x) === 4 },
  { name: 'LPS3', condition: '最长公共前后缀为 3', rp: 12345, check: x => getLPS(x) === 3 },
  { name: 'LPS2', condition: '最长公共前后缀为 2', rp: 1234, check: x => getLPS(x) === 2 },
  { name: 'LPS1', condition: '最长公共前后缀为 1', rp: 123, check: x => getLPS(x) === 1 },
  // 形态
  { name: '山', condition: '先递增后递减', rp: 1234321, check: x => {
      const s = String(x); if (s.length < 3) return false;
      let peak = -1;
      for (let i = 1; i < s.length - 1; i++) if (+s[i] > +s[i-1] && +s[i] > +s[i+1]) { peak = i; break; }
      if (peak === -1) return false;
      for (let i = 1; i <= peak; i++) if (+s[i] <= +s[i-1]) return false;
      for (let i = peak + 1; i < s.length; i++) if (+s[i] >= +s[i-1]) return false;
      return true;
    } 
  },
  { name: '谷', condition: '先递减后递增', rp: 1432234, check: x => {
      const s = String(x); if (s.length < 3) return false;
      let valley = -1;
      for (let i = 1; i < s.length - 1; i++) if (+s[i] < +s[i-1] && +s[i] < +s[i+1]) { valley = i; break; }
      if (valley === -1) return false;
      for (let i = 1; i <= valley; i++) if (+s[i] >= +s[i-1]) return false;
      for (let i = valley + 1; i < s.length; i++) if (+s[i] <= +s[i-1]) return false;
      return true;
    } 
  },
  // 奇偶
  { name: '偶数', condition: '偶数', rp: 10, check: x => x % 2 === 0 },
  { name: '奇数', condition: '奇数', rp: 10, check: x => x % 2 === 1 },
  // 质数倍数
  { name: '3的倍数', condition: '能被 3 整除', rp: 30, check: x => x % 3 === 0 },
  { name: '5的倍数', condition: '能被 5 整除', rp: 50, check: x => x % 5 === 0 },
  { name: '7的倍数', condition: '能被 7 整除', rp: 70, check: x => x % 7 === 0 },
  { name: '11的倍数', condition: '能被 11 整除', rp: 110, check: x => x % 11 === 0 },
  { name: '13的倍数', condition: '能被 13 整除', rp: 130, check: x => x % 13 === 0 },
  { name: '17的倍数', condition: '能被 17 整除', rp: 170, check: x => x % 17 === 0 },
  { name: '19的倍数', condition: '能被 19 整除', rp: 190, check: x => x % 19 === 0 },
  { name: '23的倍数', condition: '能被 23 整除', rp: 230, check: x => x % 23 === 0 },
  { name: '29的倍数', condition: '能被 29 整除', rp: 290, check: x => x % 29 === 0 },
  { name: '31的倍数', condition: '能被 31 整除', rp: 310, check: x => x % 31 === 0 },
  { name: '37的倍数', condition: '能被 37 整除', rp: 370, check: x => x % 37 === 0 },
  { name: '41的倍数', condition: '能被 41 整除', rp: 410, check: x => x % 41 === 0 },
  { name: '43的倍数', condition: '能被 43 整除', rp: 430, check: x => x % 43 === 0 },
  { name: '47的倍数', condition: '能被 47 整除', rp: 470, check: x => x % 47 === 0 },
  { name: '53的倍数', condition: '能被 53 整除', rp: 530, check: x => x % 53 === 0 },
  { name: '59的倍数', condition: '能被 59 整除', rp: 590, check: x => x % 59 === 0 },
  { name: '61的倍数', condition: '能被 61 整除', rp: 610, check: x => x % 61 === 0 },
  { name: '67的倍数', condition: '能被 67 整除', rp: 670, check: x => x % 67 === 0 },
  { name: '71的倍数', condition: '能被 71 整除', rp: 710, check: x => x % 71 === 0 },
  { name: '73的倍数', condition: '能被 73 整除', rp: 730, check: x => x % 73 === 0 },
  { name: '79的倍数', condition: '能被 79 整除', rp: 790, check: x => x % 79 === 0 },
  { name: '83的倍数', condition: '能被 83 整除', rp: 830, check: x => x % 83 === 0 },
  { name: '89的倍数', condition: '能被 89 整除', rp: 890, check: x => x % 89 === 0 },
  { name: '97的倍数', condition: '能被 97 整除', rp: 970, check: x => x % 97 === 0 },
  // 数论
  { name: '质数', condition: '大于1，正因数只有1和自身', rp: 500, check: x => isPrime(x) },
  { name: '半质数', condition: '恰好是两个质数（可相同）的乘积', rp: 250, check: x => isSemiPrime(x) },
  { name: '安全素数', condition: '素数 p，且 (p-1)/2 也是素数', rp: 2000, check: x => isPrime(x) && isPrime((x - 1) / 2) },
  { name: '索菲热尔曼素数', condition: '素数 p，且 2p+1 也是素数', rp: 2000, check: x => isPrime(x) && isPrime(2 * x + 1) },
  { name: '陈素数', condition: '素数 p，且 p+2 是素数或两个素数的乘积', rp: 1500, check: x => isPrime(x) && (isPrime(x + 2) || isSemiPrime(x + 2)) },
  { name: '费马数', condition: '形如 F_n = 2^{2^n}+1 的数', rp: 400000000, check: x => [3, 5, 17, 257, 65537, 4294967297].includes(x) },
  { name: '斐波那契数', condition: '在斐波那契数列中', rp: 14930352, check: x => isSquare(5 * x * x - 4) || isSquare(5 * x * x + 4) },
  { name: '阶乘数', condition: 'n!', rp: 39916800, check: x => [1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600].includes(x) },
  { name: '完全数', condition: '是完全数', rp: 633550336, check: x => [6, 28, 496, 8128, 33550336].includes(x) },
  { name: '卡普雷卡尔常数', condition: '是 495 或 6174', rp: 1495495495, check: x => x === 495 || x === 6174 },
  { name: '不可触碰数', condition: '不能表示为任何正整数的真因数之和的数', rp: 3000, check: x => [2, 5, 52, 88, 96, 120, 124, 146, 162, 188, 206, 210, 216, 238, 246, 248, 262, 268, 276, 288, 290, 292, 304, 306, 322, 324, 326, 336, 342, 372, 406, 408, 426, 430, 448, 472, 474, 498, 516, 518, 520, 530, 540, 552, 556, 562, 576, 584, 612, 624, 626, 628, 658, 668, 670, 708, 714, 718, 726, 728, 738, 748, 750, 756, 766, 768, 782, 784, 792, 802, 804, 818, 836, 848, 852, 872, 892, 894, 896, 898, 902, 926, 934, 936, 964, 984, 992, 996, 998].includes(x) },
  { name: '欧尔数', condition: '所有因数的调和平均是整数', rp: 5000, check: x => {
      let d = 0, sigma = 0;
      for (let i = 1; i * i <= x; i++) {
        if (x % i === 0) {
          d += (i * i === x) ? 1 : 2;
          sigma += i + (i * i === x ? 0 : x / i);
        }
      }
      return (d * x) % sigma === 0;
    } 
  },
  { name: '反质数', condition: '约数个数严格多于任何比它小的正整数', rp: 1000, check: x => {
      const highly = [1, 2, 4, 6, 12, 24, 36, 48, 60, 120, 180, 240, 360, 720, 840, 1260, 1680, 2520, 5040, 7560, 10080, 15120, 20160, 25200, 27720, 45360, 50400, 55440, 83160, 110880, 166320, 221760, 277200, 332640, 498960, 554400, 665280, 720720, 1081080, 1441440, 2162160, 2882880, 3603600, 4324320, 6486480, 7207200, 8648640, 10810800, 14414400, 17297280, 21621600, 32432400, 36756720, 43243200, 61261200, 73513440, 110270160];
      return highly.includes(x);
    } 
  },
  // 数字特征
  { name: '回文数', condition: '正读反读相同', rp: 100000, check: x => String(x) === String(x).split('').reverse().join('') },
  { name: '自守数', condition: '平方的末尾等于自身', rp: 200000000, check: x => String(x * x).endsWith(String(x)) },
  { name: '卡普雷卡尔数', condition: '平方拆成两段相加等于自身', rp: 80000000, check: x => {
      let sq = String(x * x), len = String(x).length;
      if (sq.length < len) return false;
      let right = sq.slice(-len), left = sq.slice(0, -len) || '0';
      return parseInt(left) + parseInt(right) === x;
    } 
  },
  { name: '自恋数', condition: 'n 位数，各位 n 次方和等于自身', rp: 70000000, check: x => {
      const s = String(x), len = s.length;
      let sum = 0;
      for (let c of s) sum += Math.pow(+c, len);
      return sum === x;
    } 
  },
  { name: '明希豪森数', condition: '各位数字的自身次方和等于自身', rp: 80000000, check: x => {
      let sum = 0;
      for (let c of String(x)) sum += Math.pow(+c, +c === 0 ? 0 : +c); // 0^0 = 0
      return sum === x;
    } 
  },
  { name: '快乐数', condition: '反复求各位平方和，最终到达 1', rp: 75, check: x => {
      let seen = new Set();
      while (x !== 1 && !seen.has(x)) {
        seen.add(x);
        x = String(x).split('').reduce((s, c) => s + (+c) * (+c), 0);
      }
      return x === 1;
    } 
  },
  { name: '卡特兰数', condition: '合法括号序列数/二叉树形态数', rp: 60000000, check: x => [1, 2, 5, 14, 42, 132, 429, 1430, 4862, 16796, 58786, 208012, 742900, 2674440, 9694845, 35357670].includes(x) },
  { name: '三角形数', condition: 'T_n=n(n+1)/2', rp: 80000, check: x => isSquare(8 * x + 1) },
  { name: '贝尔数', condition: 'n 元集合的划分数目', rp: 55000000, check: x => [1, 2, 5, 15, 52, 203, 877, 4140, 21147, 115975, 678570, 4213597, 27644437].includes(x) },
  { name: '莫兹金数', condition: '圆上n点间画不相交弦的方法数', rp: 25000000, check: x => [1, 2, 4, 9, 21, 51, 127, 323, 835, 2188, 5798, 15511, 41835, 113634, 310572, 853467, 2356779, 6536382, 18199284, 50852019].includes(x) },
  // 神级固定点
  { name: '西西弗斯数', condition: '是 123', rp: 3000000000, check: x => x === 123 },
  { name: '水仙花固定点', condition: '是 153', rp: 3000000000, check: x => x === 153 },
  { name: '至尊', condition: '是 1', rp: 3000000000, check: x => x === 1 },
  { name: '虚无', condition: '是 0', rp: 3000000000, check: x => x === 0 },
  { name: '最大', condition: '是 99999999', rp: 3000000000, check: x => x === 99999999 },
  { name: 'pai', condition: '是 3', rp: 3000000000, check: x => x === 3 },
  { name: 'e', condition: '是 2', rp: 3000000000, check: x => x === 2 },
  { name: '宇宙终极密码', condition: '是 42', rp: 3000000000, check: x => x === 42 }
];

function getRarity(rp) {
  if (rp <= 200) return 'Shit';
  if (rp <= 500) return 'Trash';
  if (rp <= 2000) return 'Common';
  if (rp <= 5000) return 'Uncommon';
  if (rp <= 30000) return 'Copper';
  if (rp <= 100000) return 'Silver';
  if (rp <= 600000) return 'Gold';
  if (rp <= 4000000) return 'Diamond';
  return 'Mythic';
}

function evaluateNumber(num) {
  const badges = [];
  let totalRP = 0;
  FEATURES.forEach((f, i) => {
    if (f.check(num)) {
      badges.push({ index: i, name: f.name, rp: f.rp });
      totalRP += f.rp;
    }
  });
  return { badges, totalRP, rarity: getRarity(totalRP) };
}

// ---------- 注册 ----------
async function register() {
  const username = document.getElementById('regUsername').value.trim();
  const pwd = document.getElementById('regPassword').value;
  const pwd2 = document.getElementById('regPassword2').value;
  const luckyStr = document.getElementById('regLucky').value.trim();

  if (!username) return alert('请输入用户名');
  if (username.length > 15) return alert('用户名最长 15 个字符');
  if (pwd !== pwd2) return alert('两次密码不一致');
  if (!/^\d+$/.test(luckyStr)) return alert('幸运数必须是 0-99999999 的整数');
  const lucky = parseInt(luckyStr, 10);
  if (lucky < 0 || lucky > 99999999) return alert('幸运数必须在 0 到 99999999 之间');

  const { data: existingUser } = await db
    .from('profiles').select('id').eq('username', username).maybeSingle();
  if (existingUser) return alert('该用户名已被注册，请换一个');

  const { data: existingLucky } = await db
    .from('profiles').select('id').eq('lucky_number', lucky).maybeSingle();
  if (existingLucky) return alert('该幸运数已被使用，请换一个');

  const email = username + '@gmail.com';
  const { data, error } = await db.auth.signUp({ email, password: pwd });
  if (error) return alert('注册失败：' + error.message);

  const { badges, totalRP } = evaluateNumber(lucky);
  const { error: insertError } = await db.from('profiles').insert({
    id: data.user.id,
    username,
    lucky_number: lucky,
    lucky_rp: totalRP,
    lucky_badges: badges
  });
  if (insertError) return alert('保存失败：' + insertError.message);

  alert('注册成功，请登录');
  location.href = '/login';
}

function checkPwdMatch() {
  const pwd = document.getElementById('regPassword').value;
  const pwd2 = document.getElementById('regPassword2').value;
  const hint = document.getElementById('pwdHint');
  if (!hint) return;
  if (!pwd2) { hint.textContent = ''; return; }
  if (pwd === pwd2) {
    hint.textContent = '✓ 两次密码一致';
    hint.style.color = 'green';
  } else {
    hint.textContent = '✗ 两次密码不一致';
    hint.style.color = 'red';
  }
}

// ---------- 登录 ----------
async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const pwd = document.getElementById('loginPassword').value;
  const email = username + '@gmail.com';
  const { error } = await db.auth.signInWithPassword({ email, password: pwd });
  if (error) return alert('登录失败：' + error.message);
  location.href = '/';
}

async function signOut() {
  await db.auth.signOut();
  location.reload();
}

// ---------- 导航栏 ----------
async function initNav() {
  const userInfo = document.getElementById('userInfo');
  if (!userInfo) return;
  try {
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      const { data: profile } = await db.from('profiles')
        .select('username, lucky_number, lucky_rp').eq('id', user.id).maybeSingle();
      if (profile) {
        userInfo.innerHTML =
          `<a href="/profile/${profile.lucky_number}" class="rarity-${getRarity(profile.lucky_rp || 0).toLowerCase()}">${profile.username}</a> | <a href="#" onclick="signOut();return false;">退出</a>`;
      } else {
        userInfo.innerHTML = '<a href="#" onclick="signOut();return false;">退出</a>';
      }
    } else {
      userInfo.innerHTML = '<a href="/login">登录</a> | <a href="/register">注册</a>';
    }
  } catch (e) {
    console.error('initNav 出错：', e);
    userInfo.innerHTML = '<a href="/login">登录</a> | <a href="/register">注册</a>';
  }
}

// ---------- 首页 ----------
async function initHome() {
  const welcome = document.getElementById('welcomeMsg');
  if (!welcome) return;
  try {
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      const { data: profile } = await db.from('profiles')
        .select('username').eq('id', user.id).maybeSingle();
      welcome.textContent = '欢迎回来，' + (profile ? profile.username : '用户');
    } else {
      welcome.textContent = '请先登录或注册';
    }
  } catch (e) {
    console.error(e);
  }
}

// ---------- 测试数字 ----------
function testNumber() {
  const input = document.getElementById('testNumber').value.trim();
  if (!/^\d+$/.test(input)) return alert('请输入 0-99999999 的整数');
  const num = parseInt(input, 10);
  if (num < 0 || num > 99999999) return alert('数字必须在 0 到 99999999 之间');

  const { badges, totalRP, rarity } = evaluateNumber(num);
  document.getElementById('testResult').innerHTML =
    `<p>数字：${num}</p>` +
    `<p>稀有度：<strong>${rarity}</strong>（${totalRP} RP）</p>` +
    `<p>命中荣誉：${badges.length
      ? badges.map(b => `${b.name}（${b.rp} RP）`).join('、')
      : '无'}</p>`;
}

// ---------- 用户列表 ----------
async function initRank() {
  const div = document.getElementById('rankList');
  if (!div) return;
  try {
    const { data, error } = await db.from('profiles')
      .select('username, lucky_number, lucky_rp')
      .order('lucky_number', { ascending: true });

    if (error) { div.innerHTML = '加载失败：' + error.message; return; }
    if (!data || data.length === 0) { div.innerHTML = '<p>暂无用户</p>'; return; }

    div.innerHTML = data.map((p, i) =>
      `<p>${i + 1}. <a href="/profile/${p.lucky_number}" class="rarity-${getRarity(p.lucky_rp || 0).toLowerCase()}">${p.username}</a> — ` +
      `幸运数 ${p.lucky_number}，稀有度 ${p.lucky_rp}（${getRarityHtml(p.lucky_rp)}）</p>`
    ).join('');
  } catch (e) {
    div.innerHTML = '加载出错：' + e.message;
    console.error(e);
  }
}

// ---------- 荣誉列表 ----------
function initPrize() {
  const div = document.getElementById('prizeList');
  if (!div) return;
  div.innerHTML = FEATURES.map(f =>
    `<p>${f.name}（${f.rp} RP） - ${f.condition}</p>`
  ).join('');
}

// ---------- 个人中心 ----------
async function initProfile() {
  const lucky = location.pathname.split('/').pop();
  if (!lucky || lucky === 'profile' || lucky === 'profile.html' || isNaN(lucky)) { location.href = '/rank'; return; }

  const nameEl = document.getElementById('profileName');
  try {
    const { data: p } = await db.from('profiles')
      .select('username, lucky_number, lucky_rp, lucky_badges')
      .eq('lucky_number', lucky)
      .maybeSingle();

    if (!p) { nameEl.textContent = '用户不存在'; return; }

    nameEl.innerHTML = `<span class="rarity-${getRarity(p.lucky_rp || 0).toLowerCase()}">${p.username}</span>`;
    document.getElementById('luckyNumber').textContent = p.lucky_number;
    document.getElementById('luckyRP').innerHTML =
      `${p.lucky_rp}（${getRarityHtml(p.lucky_rp)}）`;

    const badges = p.lucky_badges || [];
    const ul = document.getElementById('badgeList');
    ul.innerHTML = badges.length
      ? badges.map(b => `<li>${b.name}（${b.rp} RP）</li>`).join('')
      : '<li>无</li>';
  } catch (e) {
    nameEl.textContent = '加载出错';
    console.error(e);
  }
}

// ---------- 管理面板 ----------
async function initAdmin() {
  const msg = document.getElementById('adminMsg');
  const area = document.getElementById('adminArea');
  if (!msg) return;
  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) { msg.textContent = '请先登录'; return; }
    const { data: profile } = await db.from('profiles')
      .select('username').eq('id', user.id).maybeSingle();
    if (!profile || !['Luojt95'].includes(profile.username)) {
      msg.textContent = '你没有权限访问此页面';
      return;
    }
    msg.textContent = '管理员：' + profile.username;
    area.style.display = 'block';

    const { data } = await db.from('profiles')
      .select('id, username, lucky_number, lucky_rp')
      .order('lucky_number', { ascending: true });

    const rows = document.getElementById('userRows');
    if (!data || data.length === 0) {
      rows.innerHTML = '<tr><td colspan="4">暂无用户</td></tr>';
      return;
    }
    rows.innerHTML = data.map(p => `
      <tr>
        <td>${p.username}</td>
        <td>
          <input type="number" value="${p.lucky_number}" id="lucky_${p.id}" style="width:130px">
          <button onclick="updateLucky('${p.id}')">保存</button>
        </td>
        <td>${p.lucky_rp}（${getRarityHtml(p.lucky_rp)}）</td>
        <td><button onclick="deleteUser('${p.id}', '${p.username}')" style="color:red">注销</button></td>
      </tr>
    `).join('');
  } catch (e) {
    msg.textContent = '加载出错：' + e.message;
    console.error(e);
  }
}

async function updateLucky(userId) {
  const input = document.getElementById('lucky_' + userId);
  const luckyStr = input.value.trim();
  if (!/^\d+$/.test(luckyStr)) return alert('幸运数必须是 0-99999999 的整数');
  const lucky = parseInt(luckyStr, 10);
  if (lucky < 0 || lucky > 99999999) return alert('幸运数必须在 0 到 99999999 之间');

  const { data: existing } = await db.from('profiles')
    .select('id').eq('lucky_number', lucky).maybeSingle();
  if (existing && existing.id !== userId) return alert('该幸运数已被使用');

  const { badges, totalRP } = evaluateNumber(lucky);
  const { error } = await db.from('profiles').update({
    lucky_number: lucky,
    lucky_rp: totalRP,
    lucky_badges: badges
  }).eq('id', userId);
  if (error) return alert('修改失败：' + error.message);
  alert('已修改');
  initAdmin();
}

async function deleteUser(userId, username) {
  if (!confirm(`确定注销用户 ${username}？所有数据将永久删除。`)) return;
  const { error } = await db.rpc('delete_user', { target_id: userId });
  if (error) return alert('注销失败：' + error.message);
  alert('已注销');
  initAdmin();
}

async function recalcAllRP() {
  if (!confirm('确定要重新测算所有用户的 RP 吗？')) return;
  const btn = document.querySelector('#adminArea button');
  if (btn) { btn.disabled = true; btn.textContent = '重测中...'; }

  const { data: users, error } = await db.from('profiles')
    .select('id, username, lucky_number');
  if (error) {
    alert('读取用户失败：' + error.message);
    if (btn) { btn.disabled = false; btn.textContent = 'RP 重测'; }
    return;
  }

  let done = 0, failed = 0, firstErr = '';
  for (const u of users) {
    const { badges, totalRP } = evaluateNumber(u.lucky_number);
    const { error: upErr } = await db.from('profiles').update({
      lucky_rp: totalRP,
      lucky_badges: badges
    }).eq('id', u.id);
    if (upErr) { failed++; if (!firstErr) firstErr = upErr.message; } else done++;
  }

  alert(`重测完成：成功 ${done} 个，失败 ${failed} 个` + (firstErr ? '\n首个错误：' + firstErr : ''));
  if (btn) { btn.disabled = false; btn.textContent = 'RP 重测'; }
  initAdmin();
}

// ---------- 路由 ----------
async function init() {
  await initNav();
  const path = location.pathname;
  if (path === '/' || path === '/index.html') initHome();
  else if (path.startsWith('/profile/')) initProfile();
  else if (path === '/prize' || path === '/prize.html') initPrize();
  else if (path === '/rank' || path === '/rank.html') initRank();
  else if (path === '/admin' || path === '/admin.html') initAdmin();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
// 辅助函数：给段位加颜色
function getRarityHtml(rp) {
  const r = getRarity(rp);
  return `<span class="rarity-${r.toLowerCase()}">${r}</span>`;
}
