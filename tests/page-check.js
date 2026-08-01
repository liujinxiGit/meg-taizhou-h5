const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const checks = [
  ["页面不存在地图定位待补充", !html.includes("地图定位待补充")],
  ["页面包含门店名称", html.includes("MEG FITNESS 泰州路店")],
  ["页面包含入口地址", html.includes("余姚路派出所对面二楼")],
  ["打开地图按钮存在", /id="mapButton"[^>]*>打开地图导航<\/a>/.test(html)],
  ["复制地址按钮存在", /id="copyAddressButton"[^>]*>复制门店地址<\/button>/.test(html)]
];

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
