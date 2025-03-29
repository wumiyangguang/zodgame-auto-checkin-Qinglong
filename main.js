// ========================
// 初始化配置
// ========================
const sendNotify = require('./sendNotify');
const { HttpsProxyAgent } = require('https-proxy-agent');

const CHECKIN_URL = "https://zodgame.xyz/plugin.php?id=dsu_paulsign:sign&operation=qiandao&infloat=1&inajax=1";

// 配置项
const config = {
  // 是否输出响应内容（可通过环境变量 LOG_RESPONSE=1 启用）
  logResponse: process.env.LOG_RESPONSE === '1'
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
    proxyUsed
  } = context;

  const moodText = getMoodText(moodCode);

  let message = `🔔 **ZodGame 签到结果**\n\n`;
  message += `🕒 时间: ${new Date().toLocaleString()}\n`;
  message += `🔄 状态: **${status}**\n`;
  message += `😄 心情: ${moodText}\n`;
  message += `⏱️ 耗时: ${executionTime}ms\n`;
  
  if (proxyUsed) {
    message += `🌐 代理: 已使用 \n`;
  } else {
    message += `🌐 代理: 未使用\n`;
  }

  if (error) {
    message += `\n### ❌ 错误详情\n\`\`\`\n${error.message}\n\`\`\`\n`;
  }
  return message;
}

async function enhancedSign(cookie, formhash) {
  const startTime = Date.now();
  let moodCode, responseText;
  
  // 优先使用 ZODGAME_PROXY，其次使用 HTTP_PROXY/http_proxy
  const proxyUrl = process.env.ZODGAME_PROXY || process.env.HTTP_PROXY || process.env.http_proxy;
  const usingProxy = !!proxyUrl;

  console.log(`[PROXY] 代理检测: ${usingProxy ? '已配置' : '未配置'}`);
  if (usingProxy) {
    console.log(`[PROXY] 使用代理: ${proxyUrl}`);
  }

  try {
    moodCode = MOODS[Math.floor(Math.random() * MOODS.length)];
    console.log(`[MOOD] 使用心情参数: ${moodCode} (${getMoodText(moodCode)})`);

    // 合并基础请求头和自定义头
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

    if (usingProxy) {
      fetchOptions.agent = new HttpsProxyAgent(proxyUrl);
    }

    console.log('[REQUEST] 发送签到请求...');
    console.log('[REQUEST] 目标URL:', CHECKIN_URL);
    
    const response = await fetch(CHECKIN_URL, fetchOptions);

    responseText = await response.text();
    const executionTime = Date.now() - startTime;

    console.log(`[RESPONSE] 状态码: ${response.status}`);
    
    // 只有当 LOG_RESPONSE 为 1 时才输出任何响应信息
    if (config.logResponse) {
      console.log(`[RESPONSE] 内容长度: ${responseText.length} 字节`);
      console.log('[RESPONSE] 响应摘要:', extractKeyInfo(responseText));
      console.log('[RESPONSE] 完整响应内容:');
      console.log(responseText);
    }

    if (responseText.includes("恭喜你签到成功!")) {
      await sendNotify.sendNotify(
        "✅ 签到成功 - 今日心情: " + getMoodText(moodCode),
        generateDetailedMessage({
          status: "签到成功",
          moodCode,
          formhash,
          responseLength: responseText.length,
          executionTime,
          responseSnippet: config.logResponse ? extractKeyInfo(responseText) : "响应内容已隐藏",
          proxyUsed: usingProxy ? proxyUrl : false
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
          responseSnippet: config.logResponse ? extractKeyInfo(responseText) : "响应内容已隐藏",
          proxyUsed: usingProxy ? proxyUrl : false
        })
      );
      return false;
    }

    throw new Error(`未知响应内容: ${responseText.slice(0, 100)}...`);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('[ERROR] 签到失败:', error.message);
    
    // 只有当 LOG_RESPONSE 为 1 时才输出错误响应内容
    if (responseText && config.logResponse) {
      console.error('[ERROR] 错误响应内容:', responseText);
    }
    
    await sendNotify.sendNotify(
      "‼️ 签到失败 - 心情: " + (moodCode ? getMoodText(moodCode) : "未设置"),
      generateDetailedMessage({
        status: "签到失败",
        moodCode,
        formhash,
        responseLength: responseText?.length || 0,
        executionTime,
        error,
        responseSnippet: config.logResponse ? (responseText ? extractKeyInfo(responseText) : "无响应内容") : "响应内容已隐藏",
        proxyUsed: usingProxy ? proxyUrl : false
      })
    );
    throw error;
  }
}

function extractKeyInfo(html) {
  const pointMatch = html.match(/获得(\d+)点积分/);
  if (pointMatch) return `获得 ${pointMatch[1]} 积分`;

  const errorMatch = html.match(/<div class="alert_error">([\s\S]*?)<\/div>/);
  if (errorMatch) return errorMatch[1].trim();

  return html.length > 500 ? 
    `${html.slice(0, 200)}...\n......\n${html.slice(-200)}` : 
    html;
}

async function main() {
  console.log('[INIT] 启动签到任务');
  console.log('[CONFIG] 当前配置:', {
    logResponse: config.logResponse ? '开启(将显示响应内容)' : '关闭(不显示任何响应内容)',
    proxy: process.env.ZODGAME_PROXY ? '已配置' : '未配置'
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
