## 适用于青龙面板的ZodGame 定时自动签到

> 利用 青龙面板 定时任务实现自动签到。随机心情。

### 使用方法

 #### 1.拉取仓库

方式 1：订阅管理

```text
名称：zodgame签到
类型：公开仓库
链接：https://github.com/wumiyangguang/zodgame-auto-checkin-Qinglong.git
定时类型：crontab
定时规则：2 2 28 * *
依赖文件：无
```

方式 2：指令拉取

```sh
ql repo https://github.com/wumiyangguang/zodgame-auto-checkin-Qinglong.git "" ""
 ```

#### 2.环境变量添加

在青龙面板环境变量中添加以下变量

| 名称                          | 值                | 说明         |
|-----------------------------|------------------|------------------|
| ZODGAME_COOKIE              |                  |获取到的cookie（必选） |
| ZODGAME_FORMHASH            |                  |获取到的formhash（获取方法见注意事项）（必选）|
| LOG_RESPONSE                |        1      |在日志中完整输出网页响应内容（可选）|
| ENABLE_NOTIFY               |        1      |是否开启信息推送功能（可选）|

### 注意事项

1. 不能使用 `document.cookie` 方式获取 Cookie，因为 ZodGame 部分 Cookie 具有 [HttpOnly](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Cookies#%E9%99%90%E5%88%B6%E8%AE%BF%E9%97%AE_cookie) 属性。

2. formhash 的获取方式：登录 ZodGame 网站，F12 打开控制台，输入以下代码回车获取。

   ```Javascript
   document.querySelector('[name=formhash]').value
   ```

3. cookie 与 formhash 一一对应，更新 cookie 时必须同时更新 formhash。

4. **通知配置在青龙 config.sh 中配置**
5. **显示 fetch failed是因为国内无法解析zodgame.xyz，需在host文件增加以下内容：**

```104.26.14.223 http://www.zodgame.xyz
104.26.14.223 zodgame.xyz
104.26.15.223 http://www.zodgame.xyz
104.26.15.223 zodgame.xyz
172.67.72.167 http://www.zodgame.xyz
172.67.72.167 zodgame.xyz
```
