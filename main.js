// ========================
// 初始化配置
// ========================
const sendNotify = require('./sendNotify');
//const fetch = require('node-fetch');

// 配置常量
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const REQUEST_TIMEOUT = 10000;
const CHECKIN_URL = "https://zodgame.xyz/plugin.php?id=dsu_paulsign:sign&operation=qiandao&infloat=1&inajax=1";

// 配置项
const config = {
  logResponse: process.env.LOG_RESPONSE === '1'
};

// 错误模式定义
const ERROR_PATTERNS = {
  MAINTENANCE: /网站维护中|系统升级/i,
  INVALID_REQUEST: /无效请求|参数错误/i,
  RATE_LIMIT: /访问过于频繁|rate limit/i,
  AUTH_FAILED: /未登录|权限不足/i,
  SERVER_ERROR: /服务器错误|500错误/i
};

// 基础请求头配置
const baseHeaders = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "zh-CN,zh-TW;q=0.9,zh;q=0.8,en-US;q=0.7,en;q=0.6",
  "cache-control": "max-age=0",
  "content-type": "application/x-www-form-urlencoded",
  priority: "u=0, i",
  "sec-ch-ua": '"Not:A-Brand";v="24", "Chromium";v="134", "Google Chrome";v="134"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "iframe",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  Referer: "https://zodgame.xyz/plugin.php?id=dsu_paulsign:sign",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// 心情代码与文字映射表
const MOOD_MAP = {
  kx: "开心", 
  ng: "难过",
  ym: "郁闷",
  wl: "无聊",
  nu: "愤怒",
  ch: "惆怅",
  fd: "奋斗",
  yl: "娱乐",
  shuai: "衰"
};

const MOODS = Object.keys(MOOD_MAP);

function getMoodText(moodCode) {
  return MOOD_MAP[moodCode] || `未知心情(${moodCode})`;
}

function generateDetailedMessage(context) {
  const {
    status,
    moodCode,
    executionTime,
    error,
    responseSnippet
  } = context;

  const moodText = getMoodText(moodCode);

  let message = `🔔 **ZodGame 签到结果**\n\n`;
  message += `🕒 时间: ${new Date().toLocaleString()}\n`;
  message += `🔄 状态: **${status}**\n`;
  message += `😄 心情: ${moodText}\n`;
  message += `⏱️ 耗时: ${executionTime}ms\n`;
  
  message += `🌐 代理: 未使用\n`;

  if (status === "签到成功" && responseSnippet) {
    message += `🎁 奖励: ${responseSnippet}\n`;
  }

  if (error) {
    message += `\n### ❌ 错误详情\n\`\`\`\n${error.message}\n\`\`\`\n`;
  }

  return message;
}

async function enhancedFetch(url, options, retries = MAX_RETRIES) {
    let timeout;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text();
      const errorType = detectErrorType(response.status, body);
      throw new Error(`HTTP ${response.status} ${errorType}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeout);
    
    if (retries > 0 && isRetryableError(error)) {
      console.log(`[RETRY] 请求失败，${retries}次重试剩余... (${error.message})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return enhancedFetch(url, options, retries - 1);
    }
    throw enhanceFetchError(error);
  }
}

function detectErrorType(status, body) {
  for (const [type, pattern] of Object.entries(ERROR_PATTERNS)) {
    if (pattern.test(body)) return type;
  }
  
  switch(status) {
    case 400: return 'INVALID_REQUEST';
    case 401: return 'AUTH_FAILED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 429: return 'RATE_LIMIT';
    case 500: return 'SERVER_ERROR';
    case 502: return 'BAD_GATEWAY';
    case 503: return 'SERVICE_UNAVAILABLE';
    default: return 'UNKNOWN_ERROR';
  }
}

function isRetryableError(error) {
  const retryableCodes = [
    'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED',
    'ENOTFOUND', 'EAI_AGAIN', 'ESOCKETTIMEDOUT'
  ];
  
  return retryableCodes.some(code => error.code === code) ||
         error.message.includes('timeout') ||
         error.message.includes('aborted');
}

function enhanceFetchError(error) {
  const enhancedError = new Error(error.message);
  enhancedError.stack = error.stack;
  
  if (error.type === 'aborted') {
    enhancedError.message = `请求超时 (${REQUEST_TIMEOUT}ms)`;
    enhancedError.code = 'ETIMEDOUT';
  }
  
  return enhancedError;
}

function isValidResponse(text) {
  const validPatterns = [
    /恭喜你签到成功/,
    /您今日已经签到/,
    /formhash=/,
    /dsu_paulsign/
  ];
  
  return validPatterns.some(pattern => pattern.test(text));
}

async function enhancedSign(cookie, formhash) {
  const startTime = Date.now();
  let moodCode, responseText;

  try {
    moodCode = MOODS[Math.floor(Math.random() * MOODS.length)];
    console.log(`[MOOD] 使用心情参数: ${moodCode} (${getMoodText(moodCode)})`);

    const headers = {
      ...baseHeaders,
      'Cookie': cookie,
      'Referer': CHECKIN_URL
    };

    const fetchOptions = {
      method: 'POST',
      headers: headers,
      body: `formhash=${formhash}&qdxq=${moodCode}`
    };

    console.log('[REQUEST] 发送签到请求...');
    
    const response = await enhancedFetch(CHECKIN_URL, fetchOptions);
    responseText = await response.text();
    
    if (!isValidResponse(responseText)) {
      const errorType = detectErrorType(response.status, responseText);
      throw new Error(`无效响应: ${errorType}`);
    }

    const executionTime = Date.now() - startTime;
    console.log(`[RESPONSE] 状态码: ${response.status}`);
    
    if (config.logResponse) {
      console.log('[RESPONSE] 响应内容:');
      console.log(responseText);
    }

    if (responseText.includes("恭喜你签到成功")) {
        const rewardInfo = extractKeyInfo(responseText);
        await sendNotify.sendNotify(
            `✅ 签到成功 - 获得奖励`, 
            generateDetailedMessage({
            status: "签到成功",
            moodCode,
            formhash,
            responseLength: responseText.length,
            executionTime,
            responseSnippet: rewardInfo
            })
        );
        return true;
    } 

    if (responseText.includes("您今日已经签到")) {
      await sendNotify.sendNotify(
        "🔄 签到重复 - 今日心情: " + getMoodText(moodCode),
        generateDetailedMessage({
          status: "今日已签到",
          moodCode,
          formhash,
          responseLength: responseText.length,
          executionTime,
          responseSnippet: config.logResponse ? extractKeyInfo(responseText) : "响应内容已隐藏"
        })
      );
      return false;
    }

    throw new Error(`未知响应内容: ${responseText.slice(0, 100)}...`);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[ERROR] 签到失败: ${error.message}`);
    
    let errorCategory = '';
    if (error.message.includes('HTTP')) errorCategory = 'HTTP_ERROR';
    if (error.message.includes('无效响应')) errorCategory = 'INVALID_RESPONSE';
    
    await sendNotify.sendNotify(
      `‼️ 签到失败 - ${errorCategory}`,
      generateDetailedMessage({
        status: "签到失败",
        moodCode,
        formhash,
        executionTime,
        error: {
          message: error.message,
          type: error.code || errorCategory
        }
      })
    );
    throw error;
  }
}

function extractKeyInfo(html) {
  const rewardMatch = html.match(/恭喜你签到成功!获得随机奖励\s+([^\s]+)\s+(\d+)\s+([^\<]+)/);
  if (rewardMatch) {
    return `获得 ${rewardMatch[2]}${rewardMatch[3]}${rewardMatch[1]}`;
  }

  const errorMatch = html.match(/<div class="alert_error">([\s\S]*?)<\/div>/);
  if (errorMatch) return errorMatch[1].trim();


  return html.length > 500 ? 
    `${html.slice(0, 200)}...\n......\n${html.slice(-200)}` : 
    html;
}

async function main() {
  console.log('[INIT] 启动签到任务');
  console.log('[CONFIG] 当前配置:', {
    logResponse: config.logResponse ? '开启(将显示响应内容)' : '关闭(不显示任何响应内容)'
  });
  
  try {
    const cookie = process.env.ZODGAME_COOKIE;
    const formhash = process.env.ZODGAME_FORMHASH;

    if (!cookie || !formhash) {
      throw new Error("环境变量未配置: 需要 ZODGAME_COOKIE 和 ZODGAME_FORMHASH");
    }

    console.log('[AUTH] 已获取cookie和formhash');
    console.log('[TASK] 开始执行签到...');
    
    await enhancedSign(cookie, formhash);
    
    console.log('[DONE] 任务完成');

  } catch (error) {
    console.error('[FATAL] 任务失败:', error.message);
    process.exit(1);
  }
}

main();
