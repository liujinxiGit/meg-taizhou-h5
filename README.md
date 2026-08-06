# MEG FITNESS 泰州路店开业活动 H5

这是一个面向宣传单扫码用户的独立移动端活动页。用户可查看开业活动、在四项免费体验中选择一项、获得匿名预约编号、复制对应咨询话术，并通过店长微信二维码完成领取和预约。访客端不提供表单，不收集姓名、手机号、微信号、年龄、性别或健康信息。

项目使用原生 HTML、CSS、JavaScript、Cloudflare Pages Functions 与 D1，不使用大型前端框架。内部后台产品为 **MEG Operations｜门店线索与预约工作台**，源码位于 `ops/`；正式域名为 `megops.jinxiliu.com`。后台主认证方式为固定密码加 30 天 HttpOnly 签名 Cookie，Cloudflare Access JWT 仅作为迁移期可选兼容层。

项目同时提供独立英文版 `en/index.html`，面向静安区附近希望进行 Open Gym 独立训练的英文用户。中文入口为 `/`，英文入口为 `/en/`，语言仅由用户主动切换。

## 本地预览

只查看静态内容时仍可直接双击 `index.html`。需要测试预约编号、D1 和后台时，应使用 Wrangler Pages 本地环境，见本文后面的“D1、Pages Functions 与后台部署”章节。仅预览静态页面可运行：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。纯函数测试页位于 `http://localhost:8080/tests/test.html`。

## 文件结构

```text
meg-taizhou-h5/
├── index.html       页面语义结构
├── en/
│   └── index.html   独立英文页面
├── styles.css       移动端样式与弹窗样式
├── app.js           交互、状态、统计与纯函数
├── config.js        门店、活动、项目和素材配置
├── _headers          Cloudflare Pages 的 HTML 禁止缓存规则
├── assets/          门店照片与店长二维码
├── functions/       Pages Functions 公开 API、后台 API 与共享认证逻辑
├── migrations/      D1 数据库迁移
├── ops/             MEG Operations 独立后台页面
├── wrangler.toml    活动页 Pages 配置模板
├── wrangler.ops.toml 后台 Pages 配置模板
├── tests/
│   ├── test.html    浏览器测试入口
│   ├── test.js      无依赖纯函数断言
│   ├── page-check.js 中文页面静态检查
│   └── en-page-check.js 英文页面静态检查
└── README.md
```

## 内容和素材配置

当前 H5 静态资源版本号为 `20260806-1`，Operations 静态资源版本号为 `20260806-4`。每次发布新版本时，统一更新对应 HTML 中 CSS/JS/图片的 `?v=` 与相关测试断言；H5 素材版本还需同步 `config.js` 的 `assetVersion`。

日常会修改的信息集中在 `config.js`；会员价格、店长名称、微信号和二维码直接写在 `index.html`，确保 JavaScript 未加载时仍可见：

- 替换门店照片：当前 `assets/` 内使用《0515-健身房效果图方案.pdf》及电梯厅、走廊效果图；已排除楼梯画面。将正式实拍 WebP 按 `gallery` 中的路径覆盖，或修改对应 `src`。首图为 `assets/hero.webp`。
- 替换店长二维码：将二维码保存为 `assets/manager-wechat.png`，或修改 `managerQr`。
- 修改店长姓名、微信号或会员价格：直接修改 `index.html` 中的底部店长区、领取弹窗和会员价格区。
- 修改四个项目名额：修改各项目的 `quota`；需要显示剩余数时，将 `showRemaining` 改为 `true` 并更新 `remaining`。剩余数是人工配置，不是实时名额。
- 修改活动截止时间：同时修改带 `+08:00` 的 `deadline` 和展示用 `deadlineText`。
- 修改门店地址或地图链接：直接修改 `index.html` 的地址 Card。地图按钮当前使用高德 URI API，以完整地址作为搜索关键词。
- 修改品牌强调色：修改 `accentColor`；当前颜色仅为临时视觉强调色，并非未经确认的品牌色。

图片缺失时页面会自动显示灰色文字占位，不会出现 broken image 图标。建议首屏图控制在 300 KB 内，相册单图控制在 200 KB 内；按实际展示尺寸裁切，使用 WebP，二维码保留 PNG 并确保边缘清晰。

### 教练与三店图片

正式品牌 Logo 已由用户提供的 Illustrator 文件导出为透明 PNG：

- `assets/meg-logo-horizontal.png`：用于中英文首屏顶部。
- `assets/meg-logo-vertical.png`：用于 favicon 和页面底部品牌区。

更新 Logo 时建议从原始 AI 文件重新导出透明背景 PNG，不要直接截屏；覆盖同名文件后同步升级资源版本号。

教练照片已经按页面比例处理为 WebP，可直接替换同名文件：

- `assets/coach-xu.webp`：教练主照片，4:5 竖图，推荐 1000 × 1250 px。
- `assets/coach-xu-training.webp`：训练教学照片，3:2 横图，推荐 1200 × 800 px；4:3 横图也可使用。

门店照片建议统一使用 4:3 横图、1200 × 900 px：

- `assets/location-pac.webp`：已使用PAC店商场门面实拍。
- `assets/location-wuding.webp`：已使用武定路店门头实拍。
- `assets/location-taizhou.webp`

PAC店另外八张实拍已经放入详情相册，包含商场门面、力量器械、综合训练架、有氧设备、划船机、拳击装备、补给区和洗手区。武定路店另外五张实拍也已放入详情相册。

替换时覆盖对应同名文件即可。WebP 推荐质量 75—85，并尽量将单张文件控制在 200 KB 内。若照片路径不存在，页面会显示带门店名称的品牌风格占位卡，不会显示破图；上线新照片后仍应升级全站 `?v=` 版本号，避免微信继续读取旧缓存。

## 来源链接与宣传单二维码

在正式页面地址后添加 `source` 参数，为不同投放渠道生成独立链接：

```text
https://example.com/meg-taizhou-h5/?source=street
https://example.com/meg-taizhou-h5/?source=community-a
https://example.com/meg-taizhou-h5/?source=community-b
https://example.com/meg-taizhou-h5/?source=coach-liu
```

使用可信的二维码生成工具将完整链接生成二维码；印刷前务必用微信扫码验证参数、页面和二维码清晰度。页面会在 localStorage 保存首次/最近来源、首次/最近访问时间及最多 200 条匿名事件日志。预约编号仅在当前页面会话的 sessionStorage 中按项目保存，不使用长期 localStorage 保存预约轨迹。

`trackEvent` 仍只写控制台和 localStorage。D1 线索仅在用户明确打开预约 Bottom Sheet 后创建；复制成功后只把该线索的 `event_stage` 幂等更新为 `message_copied`。网页不会伪造“已加微信”“已发送”“已预约”“已到店”或“已成交”，这些状态只能由店长在后台手动更新。

## D1、Pages Functions 与后台部署

### 1. 创建 D1 与应用 migration

在 Cloudflare 账号中创建数据库，名称固定为 `meg-operations`：

```bash
npx wrangler d1 create meg-operations
```

将命令返回的真实 `database_id` 分别填入 `wrangler.toml` 和 `wrangler.ops.toml`，替换 `REPLACE_WITH_D1_DATABASE_ID`。先在本地应用 migration：

```bash
npx wrangler d1 migrations apply meg-operations --local
```

确认本地测试通过后，再由人工明确执行远程 migration：

```bash
npx wrangler d1 migrations apply meg-operations --remote
```

数据库 binding 必须命名为 `DB`。`migrations/0001_create_leads.sql` 创建 `leads` 与匿名状态历史表 `lead_status_history`，不包含姓名、手机号、微信号或 IP 字段。

### 2. 生成后台 Secret

在仓库根目录运行：

```bash
node scripts/generate-ops-secrets.mjs
```

脚本会隐藏交互式密码输入，并只在终端输出 `OPS_PASSWORD_HASH`、`OPS_PASSWORD_HASH_FINGERPRINT` 和 `OPS_SESSION_SECRET`，不会写入任何文件。指纹是完整密码 Hash 字符串的 SHA-256 前 12 位十六进制，只用于与安全诊断返回值比对。非交互环境可通过临时的 `OPS_PASSWORD` 环境变量传入待哈希密码；不要使用会进入 shell history 的明文命令行参数。密码至少 12 个字符。

密码哈希格式为：

```text
pbkdf2_sha256$100000$saltBase64$hashBase64
```

它使用 PBKDF2-HMAC-SHA-256、至少 16 字节随机 salt 和 32 字节输出。`OPS_SESSION_SECRET` 是 32 字节随机值的 base64url 编码。不要把脚本输出粘贴到 `wrangler.toml`、源码、README 或 Git 追踪文件。

登录故障排查期间，登录 API 的失败响应会直接包含 `passwordHashFingerprint`、`stage`、`passwordHashRead` 和 `sessionSecretRead`。指纹是密码 Hash 的 12 位 SHA-256 前缀；响应不会返回 Secret、哈希、salt 或密码内容。若同时设置 `OPS_AUTH_DEBUG=true`，仅在 Web Crypto 抛出异常时额外返回截断至 160 字符的 `cryptoErrorName`、`cryptoErrorMessage` 和 `cryptoErrorStage`，不返回堆栈或加密输入。加密运算异常返回 HTTP `503` 与 `auth_configuration_error`，不会记为密码错误。`password_mismatch` 表示 PBKDF2 已成功执行但输入密码与 Hash 不对应；`session_signing_failed` 表示密码已通过、问题发生在 Session Secret 或签名阶段。排查完成后应恢复为不返回这些诊断字段。

生产兼容运行时检查使用真实 Wrangler Pages/workerd 启动完整登录 Function：

```bash
node tests/wrangler-pages-pbkdf2-check.mjs
```

测试会临时生成无生产意义的凭据，验证默认 100000 次 PBKDF2、正确密码和错误密码分支，不读取或输出 Production Secret。

### 3. 本地开发

活动页与公开 API 联调：

```bash
npx wrangler pages dev . --d1 DB --binding LOCAL_DEV=true
```

后台密码登录联调时，把生成的两个值手动放入 `ops/.dev.vars`（该文件已被 `.gitignore` 排除），然后运行：

```bash
cd ops
npx wrangler pages dev . --d1 DB --binding LOCAL_DEV=false
```

本地地址应同时加入 `OPS_ORIGINS`，例如在 `ops/.dev.vars` 中设置 `OPS_ORIGINS=http://localhost:8788`。本地开发绕过只在显式设置 `LOCAL_DEV=true` 且主机名为 `localhost` 或 `127.0.0.1` 时生效；要测试真实密码会话必须使用 `LOCAL_DEV=false`。生产环境必须保持 `LOCAL_DEV=false`，代码中不存在 URL bypass 参数或默认密码。

### 4. Pages 项目与 D1 binding

现有活动 Pages 项目继续使用仓库根目录作为输出，保留 `taizhou.jinxiliu.com`。在 **Workers & Pages → 现有活动项目 → Settings → Bindings** 中增加 D1 binding：

- Variable name：`DB`
- D1 database：`meg-operations`

后台建议在同一仓库创建第二个 Pages 项目：

- Project name：`meg-operations`
- Production branch：与活动页相同
- Build command：留空
- Build output directory：`ops`
- Functions：继续使用仓库根目录的 `functions/`

后台项目同样绑定 `DB` 到 `meg-operations`。活动域名访问 `/ops/` 时 Functions 会返回 404；后台项目根目录直接输出 `ops/index.html`。

> `wrangler.toml` 和 `wrangler.ops.toml` 是待填真实 Cloudflare ID 的部署模板。现有活动项目如已经在 Dashboard 配置过 Pages 选项，部署前应先核对或使用 `npx wrangler pages download config`，避免手写配置覆盖 Dashboard 中已有设置。

### 5. 环境变量与加密 Secret

两个 Pages 项目的 Production 与 Preview 环境均需要核对以下非敏感变量：

```text
PUBLIC_ORIGINS=https://taizhou.jinxiliu.com
OPS_ORIGINS=https://megops.jinxiliu.com
CF_ACCESS_TEAM_DOMAIN=<Cloudflare Zero Trust team name>
CF_ACCESS_AUD=<Access Application Audience AUD>
LOCAL_DEV=false
```

`CF_ACCESS_TEAM_DOMAIN` 与 `CF_ACCESS_AUD` 只用于可选的 Access JWT 兼容验证；停用 Access 后可以保留，代码不会要求浏览器必须带 Access JWT。

进入 **Workers & Pages → 对应 Pages 项目 → Settings → Variables and Secrets → Add**，分别添加以下值，并选择 **Encrypt / Secret**：

```text
OPS_PASSWORD_HASH=<生成脚本输出的完整密码哈希>
OPS_SESSION_SECRET=<生成脚本输出的随机会话密钥>
```

至少给 `meg-operations` 的 Production 环境配置；如果 `meg-taizhou-h5` 仍部署兼容的 `/api/ops/*`，也给前台项目配置相同两个 Secret。需要测试 Preview 时单独给 Preview 配置。保存 Secret 后必须重新部署对应 Pages 项目，Functions 才能读取新值。严禁把 Secret 放进 Wrangler `[vars]`、前端文件或 Git。

### 6. 后台密码会话

`POST /api/ops/auth/login` 在服务端校验密码哈希；成功后设置 `meg_ops_session` Cookie。Cookie 为 `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`，前端 JavaScript 无法读取，内容是 30 天有效的 HMAC-SHA-256 签名载荷。Dashboard 启动时先调用 `GET /api/ops/auth/session`；只有自有 Cookie 有效才加载业务数据。`POST /api/ops/auth/logout` 会立即清除 Cookie。

所有已有 `/api/ops/*` 业务接口仍会在源站调用统一的 `authorizeOps()`：有效自有 Cookie或有效 Access JWT 任一即可，同时继续执行 Origin、参数、D1 与 CSV 隐私校验。生产默认使用自有 Cookie。

登录端点对同一 IP + User-Agent 的不可逆 SHA-256 短期哈希记录失败次数：5 分钟最多 5 次失败，第 6 次起返回 `429` 和 `Retry-After`，成功登录后清除计数；完整 IP、密码、密码哈希和会话 Secret 均不写日志或 D1。作为边缘层加固，建议在 **Security → WAF → Rate limiting rules** 为 URI Path 等于 `/api/ops/auth/login` 添加 5 分钟窗口的限流规则。WAF 规则按请求计数，应用层仍只按失败计数。

### 7. Cloudflare Access 安全下线顺序

不要先删除 Access。按以下顺序迁移：

1. 为后台 Pages 添加加密的 `OPS_PASSWORD_HASH`。
2. 添加加密的 `OPS_SESSION_SECRET`。
3. 部署新版本，同时暂时保留现有 Access Application。
4. 用 Access 允许的浏览器进入 `megops.jinxiliu.com`。
5. 在 MEG 自有登录页输入密码，确认 Dashboard 和 30 天 Session 正常。
6. 确认未带自有 Cookie时 `GET /api/ops/summary` 返回 `401`（测试时不要让请求携带 Access JWT）。
7. 进入 **Zero Trust → Access controls → Applications**，停用或删除保护 `megops.jinxiliu.com` 的 Self-hosted Application。
8. 用无痕窗口重新访问，确认直接出现 MEG 自有密码登录页，不再出现 Access 页面。
9. 再次验证未登录 API 为 `401`、登录后 Dashboard/详情/状态/备注/回收站/CSV 正常。

只要 Access 仍保护整个域名，访问者就会先看到 Access 页面；这是迁移期的预期行为。代码保留 Access JWT 签名、issuer、audience 与过期校验作为可选兼容层，但网页主流程不依赖 Access。

### 8. 更换后台密码与强制退出

重新运行 `node scripts/generate-ops-secrets.mjs`，把新的 `OPS_PASSWORD_HASH` 更新为加密 Secret 后重新部署即可换密码。仅更新密码哈希不会让已经签发的 Cookie 退出；如需强制所有浏览器重新登录，必须同时更新 `OPS_SESSION_SECRET`。更新 Session Secret 后，所有旧 Cookie 的签名都会立即失效。

### 9. 绑定后台域名

在后台 Pages 项目 **Custom domains** 中添加 `megops.jinxiliu.com`。开放自定义域名前先完成 D1、非敏感变量与两个加密 Secret 配置。迁移期间保留现有 Access Application，完成自有密码验证后再按上面的顺序停用。不要绑定 `admin.jinxiliu.com`，也不要使用活动域名的 `/admin` 路径。

### 10. 查看数据与导出 CSV

可在 **Workers & Pages → D1 → meg-operations → Console** 查看匿名数据，或执行：

```bash
npx wrangler d1 execute meg-operations --remote --command "SELECT claim_code, created_at, service, source, status FROM leads ORDER BY created_at DESC LIMIT 50;"
```

店长通过 MEG 自有密码登录 Operations 后，可按日期、门店、项目、来源、状态和语言筛选，并点击“导出 CSV”。CSV 只包含匿名线索字段，不包含姓名、手机号、微信号或 IP。

### 11. Migration 回滚

D1 migration 不提供自动 down migration。生产应用前先使用 D1 Time Travel/导出建立恢复点；需要撤销结构时，优先新增一个向前修复 migration。若必须恢复整个数据库，使用 Cloudflare D1 Time Travel 或已导出的备份，不要直接删除生产表。

### 12. 隐私与防滥用

- 数据库不保存访客姓名、手机号、微信号、年龄、性别、健康状况或完整 IP。
- 粗粒度设备与浏览器类别由服务端 User-Agent 推断。
- 基础频率限制仅使用 Cloudflare 原生 Rate Limiter（如配置）或对 IP + User-Agent 生成的短期不可逆哈希；哈希只用于短时缓存，不写入 D1、不在后台显示。
- 同一浏览器会话、同一服务复用预约编号；不同服务可生成不同编号。
- 若请求失败，访客仍可复制无编号话术并添加许教练微信，不阻断原转化路径。
- 如出现明显垃圾请求，再在公开创建接口前增加无感 Turnstile；第一版不增加访客操作步骤。

## 静态内容部署

将整个 `meg-taizhou-h5` 目录原样上传至支持 HTTPS 的静态服务器、对象存储静态网站或 CDN。必须保持目录结构和文件名大小写一致。HTTPS 能让现代 Clipboard API 正常工作；非 HTTPS 和部分微信环境会自动改用 textarea 兼容复制。

## 微信内浏览器测试

- 至少使用一台 iPhone 和一台安卓手机，在微信内扫码进入测试。
- 验证长按识别店长二维码、复制话术、底部安全区、弹窗下滑关闭和返回键行为。
- 微信内 `navigator.clipboard` 支持情况不一，本项目带 `document.execCommand('copy')` fallback；极旧 WebView 仍可能需要用户手动长按复制。
- 倒计时以配置中的中国标准时间（`+08:00`）解析，但静态页面只能使用用户设备时钟，因此仅作视觉提示，不能作为最终领取凭证。最终资格以店长微信确认时间为准。

## 正式上线前检查清单

- [x] 补充并核对店长姓名、微信号和二维码
- [ ] 开业实景拍摄完成后，用正式照片替换当前 1 张首屏效果图和 7 张环境效果图
- [ ] 设置并实机验证地图链接
- [ ] 确认临时强调色是否替换为正式品牌色
- [ ] 核对活动截止时间、名额、权益和规则
- [ ] 检查四项体验及专项咨询话术中的预约编号
- [ ] 在微信 iOS、微信 Android 和普通手机浏览器测试
- [ ] 使用不同 `source` 链接验证本地记录
- [ ] 运行 `tests/test.html`，确认全部测试通过
- [ ] 使用正式 HTTPS 地址生成并实测宣传单二维码
- [ ] 确认隐私说明和统计方案符合上线要求
