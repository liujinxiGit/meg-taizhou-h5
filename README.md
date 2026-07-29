# MEG FITNESS 泰州路店开业活动 H5

这是一个面向宣传单扫码用户的独立移动端静态页面。用户可查看开业活动、在三项免费体验中选择一项、复制对应咨询话术，并通过店长微信二维码完成领取和预约。项目不接数据库、登录、支付、预约后台或任何前端框架。

## 本地预览

页面不依赖构建工具，可直接双击 `index.html` 预览。为获得更接近正式环境的复制功能表现，建议在项目目录运行：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。纯函数测试页位于 `http://localhost:8080/tests/test.html`。

## 文件结构

```text
meg-taizhou-h5/
├── index.html       页面语义结构
├── styles.css       移动端样式与弹窗样式
├── app.js           渲染、交互、统计与纯函数
├── config.js        门店、活动、项目和素材配置
├── assets/          门店照片与店长二维码
├── tests/
│   ├── test.html    浏览器测试入口
│   └── test.js      无依赖断言
└── README.md
```

## 内容和素材配置

日常会修改的信息集中在 `config.js`：

- 替换门店照片：当前 `assets/` 内使用《泰州路效果图旧.pdf》提取的空间效果图；将正式实拍 WebP 按 `gallery` 中的路径覆盖，或修改对应 `src`。首图为 `assets/hero.webp`。
- 替换店长二维码：将二维码保存为 `assets/manager-wechat.png`，或修改 `managerQr`。
- 修改店长姓名和微信号：修改 `managerName`、`managerWechat`。
- 修改三个项目名额：修改各项目的 `quota`；需要显示剩余数时，将 `showRemaining` 改为 `true` 并更新 `remaining`。剩余数是人工配置，不是实时名额。
- 修改活动截止时间：同时修改带 `+08:00` 的 `deadline` 和展示用 `deadlineText`。
- 设置地图链接：把腾讯地图、高德地图或其他适合移动端打开的完整链接填入 `mapUrl`。留空时按钮自动禁用并显示“地图定位待补充”。
- 修改品牌强调色：修改 `accentColor`；当前颜色仅为临时视觉强调色，并非未经确认的品牌色。

图片缺失时页面会自动显示灰色文字占位，不会出现 broken image 图标。建议首屏图控制在 300 KB 内，相册单图控制在 200 KB 内；按实际展示尺寸裁切，使用 WebP，二维码保留 PNG 并确保边缘清晰。

## 来源链接与宣传单二维码

在正式页面地址后添加 `source` 参数，为不同投放渠道生成独立链接：

```text
https://example.com/meg-taizhou-h5/?source=street
https://example.com/meg-taizhou-h5/?source=community-a
https://example.com/meg-taizhou-h5/?source=community-b
https://example.com/meg-taizhou-h5/?source=coach-liu
```

使用可信的二维码生成工具将完整链接生成二维码；印刷前务必用微信扫码验证参数、页面和二维码清晰度。页面会在 localStorage 保存首次/最近来源、首次/最近访问时间及最多 200 条事件日志。

`trackEvent` 当前只写控制台和 localStorage。未来接入百度统计、腾讯云分析或自建接口时，可在该函数中增加 SDK 调用或 `fetch` 上报，同时保留现有事件结构，并注意取得必要的隐私同意、设置超时及失败降级，不要阻塞页面交互。

## 静态部署

将整个 `meg-taizhou-h5` 目录原样上传至支持 HTTPS 的静态服务器、对象存储静态网站或 CDN。必须保持目录结构和文件名大小写一致。HTTPS 能让现代 Clipboard API 正常工作；非 HTTPS 和部分微信环境会自动改用 textarea 兼容复制。

## 微信内浏览器测试

- 至少使用一台 iPhone 和一台安卓手机，在微信内扫码进入测试。
- 验证长按识别店长二维码、复制话术、底部安全区、弹窗下滑关闭和返回键行为。
- 微信内 `navigator.clipboard` 支持情况不一，本项目带 `document.execCommand('copy')` fallback；极旧 WebView 仍可能需要用户手动长按复制。
- 倒计时以配置中的中国标准时间（`+08:00`）解析，但静态页面只能使用用户设备时钟，因此仅作视觉提示，不能作为最终领取凭证。最终资格以店长微信确认时间为准。

## 正式上线前检查清单

- [ ] 补充并核对店长姓名、微信号和二维码
- [ ] 开业实景拍摄完成后，用正式照片替换当前 1 张首屏效果图和 7 张环境效果图
- [ ] 设置并实机验证地图链接
- [ ] 确认临时强调色是否替换为正式品牌色
- [ ] 核对活动截止时间、名额、权益和规则
- [ ] 检查三段微信咨询话术
- [ ] 在微信 iOS、微信 Android 和普通手机浏览器测试
- [ ] 使用不同 `source` 链接验证本地记录
- [ ] 运行 `tests/test.html`，确认全部测试通过
- [ ] 使用正式 HTTPS 地址生成并实测宣传单二维码
- [ ] 确认隐私说明和统计方案符合上线要求
