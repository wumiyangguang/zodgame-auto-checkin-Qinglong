// ========================
// 初始化配置
// ========================
const sendNotify= require('./sendNotify');

const CHECKIN_URL = "https://zodgame.xyz/plugin.php?id=dsu_paulsign:sign&operation=qiandao&infloat=1&inajax=1";

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

// 所有可用心情代码（从映射表自动生成）
const MOODS = Object.keys(MOOD_MAP);

// ========================
// 新增：心情代码转文字函数
// ========================
/**
 * 将心情代码转换为中文描述
 * @param {string} moodCode - 心情代码（如 "kx"）
 * @returns {string} 中文心情描述
 */
function getMoodText(moodCode) {
  return MOOD_MAP[moodCode] || `未知心情(${moodCode})`;
}

// ========================
// 增强版通知生成器（集成心情文字）
// ========================
function generateDetailedMessage(context) {
  const {
    status,
    moodCode,  // 现在接收代码而非文字
    executionTime,
    error
  } = context;

  // 转换心情代码为文字
  const moodText = getMoodText(moodCode);

  // 构造Markdown格式消息
  let message = `🔔 **ZodGame 签到结果**\n\n`;
  message += `🕒 时间: ${new Date().toLocaleString()}\n`;
  message += `🔄 状态: **${status}**\n`;
  message += `😄 心情: ${moodText}\n`; 
  message += `⏱️ 耗时: ${executionTime}ms\n`;

  // 错误详情
  if (error) {
    message += `\n### ❌ 错误详情\n\`\`\`\n${error.message}\n\`\`\`\n`;
  }
  return message;
}

// ========================
// 核心签到逻辑
// ========================
async function enhancedSign(cookie, formhash) {
  const startTime = Date.now();
  let moodCode, responseText; // 记录心情代码

  try {
    moodCode = MOODS[Math.floor(Math.random() * MOODS.length)];
    console.log(`[DEBUG] 使用心情参数: (${getMoodText(moodCode)})`);

    const response = await fetch(CHECKIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie,
        'Referer': CHECKIN_URL
      },
      body: `formhash=${formhash}&qdxq=${moodCode}`  // 使用代码提交
    });

    responseText = await response.text();
    const executionTime = Date.now() - startTime;

    // 成功判断
    if (responseText.includes("恭喜你签到成功!")) {
      await sendNotify.sendNotify(
        "✅ 签到成功 - 今日心情: " + getMoodText(moodCode),
        generateDetailedMessage({
          status: "签到成功",
          moodCode,  // 传递代码
          formhash,
          responseLength: responseText.length,
          executionTime,
          responseSnippet: extractKeyInfo(responseText)
        })
      );
      return true;
    } 

    // 重复签到判断
    if (responseText.includes("您今日已经签到")) {
      await sendNotify.sendNotify(
        "🔄 签到重复 - 今日心情: " + getMoodText(moodCode),
        generateDetailedMessage({
          status: "今日已签到",
          moodCode,
          formhash,
          responseLength: responseText.length,
          executionTime,
          responseSnippet: extractKeyInfo(responseText)
        })
      );
      return false;
    }

    throw new Error(`未知响应内容: ${responseText.slice(0, 100)}...`);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    await sendNotify.sendNotify(
      "‼️ 签到失败 - 心情: " + (moodCode ? getMoodText(moodCode) : "未设置"),
      generateDetailedMessage({
        status: "签到失败",
        moodCode,
        formhash,
        responseLength: responseText?.length || 0,
        executionTime,
        error,
        responseSnippet: responseText ? extractKeyInfo(responseText) : "无响应内容"
      })
    );
    throw error;
  }
}

// ========================
// 工具函数
// ========================
function extractKeyInfo(html) {
  // 提取积分信息
  const pointMatch = html.match(/获得(\d+)点积分/);
  if (pointMatch) return `获得 ${pointMatch[1]} 积分`;

  // 提取错误信息
  const errorMatch = html.match(/<div class="alert_error">([\s\S]*?)<\/div>/);
  if (errorMatch) return errorMatch[1].trim();

  // 默认处理
  return html.length > 500 ? 
    `${html.slice(0, 200)}...\n......\n${html.slice(-200)}` : 
    html;
}

// ========================
// 主执行流程
// ========================
async function main() {
  try {
    const cookie = process.env.ZODGAME_COOKIE;
    const formhash = process.env.ZODGAME_FORMHASH;

    if (!cookie || !formhash) {
      throw new Error("环境变量未配置");
    }

    console.log('[INFO] 任务启动');
    await enhancedSign(cookie, formhash);
    console.log('[INFO] 任务完成');

  } catch (error) {
    console.error('[ERROR] 任务失败:', error.message);
    process.exit(1);
  }
}

main();
