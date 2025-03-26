## ZodGame 定时自动签到

> 利用 青龙面板 定时任务实现自动签到。随机心情。

### 使用方法

 #### 1.拉取仓库

方式 1：订阅管理

```text
名称：zodgame签到
类型：公开仓库
链接：https://github.com/wumiyangguang/zodgame-auto-checkin-fork.git
定时类型：crontab
定时规则：2 2 28 * *
```

方式 2：指令拉取

```sh
ql repo https://github.com/wumiyangguang/zodgame-auto-checkin-fork.git
```

### 2.环境变量添加

在青龙面板环境变量中添加以下变量

| 名称                          | 值                |
|-----------------------------|------------------|
| ZODGAME_COOKIE              | cookie           |
| ZODGAME_FORMHASH            | 获取到的formhash（获取方法见注意事项）  | 


详细文档: https://ewigl.github.io/notes/posts/programming/github-actions/
### 注意事项

1. 不能使用 `document.cookie` 方式获取 Cookie，因为 ZodGame 部分 Cookie 具有 [HttpOnly](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Cookies#%E9%99%90%E5%88%B6%E8%AE%BF%E9%97%AE_cookie) 属性。

2. formhash 的获取方式：登录 ZodGame 网站，F12 打开控制台，输入以下代码回车获取。

   ```Javascript
   document.querySelector('[name=formhash]').value
   ```

3. cookie 与 formhash 一一对应，更新 cookie 时必须同时更新 formhash。
***注：通知配置为青龙 config.sh 中配置**
