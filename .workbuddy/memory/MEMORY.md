# 项目约定（指间塑 / huabobo-v2）

## Git 工作流
- 任务完成且本地自测通过后，**自动提交并推送**，不用再询问用户。
- 提交信息用中文，首行一句话说清改了什么，正文列具体改动；不要把无关改动混进同一笔。
- 远端：`https://github.com/wadouludi-cc/huabobo-v2.git`（public，main 分支）。
- 推送限制：沙箱内 `github.com:443` 走代理返回 502，且命令行没有 GitHub 凭证（钥匙串无 github.com 条目）。`api.github.com`、`raw.githubusercontent.com`、`ssh.github.com:443` 可通，可用于校验远端状态。实际推送需用户在 GitHub Desktop 或本地终端执行。
- 历史被重写后（reset --soft / rebase）需 `git push --force-with-lease`；备份分支命名 `backup-before-*`。

## 测试
- 冒烟：`cd backend && node scripts/smoke.js`（需先启动后端，健康检查 `/api/health`）。改动接口行为时要同步更新 `backend/scripts/smoke.js`，CI 的 backend / backend-pg / docker-image / deploy-test 都跑它。
- 本地不污染 dev.db 的跑法：`DATABASE_URL=file:/tmp/hb-smoke.db PORT=3311 node src/seed.js` → 同环境变量起服务 → `SMOKE_BASE=http://127.0.0.1:3311 node scripts/smoke.js`（.env 不会覆盖已存在的环境变量）。
- 改后台静态文件（admin.js/admin.css）时同步改 `backend/public/admin/index.html` 里的 `?v=` 版本号，否则用户浏览器用旧缓存。前端页面同理（`js/*.js?v=`）。

## 3D / WebGL 页面的自动化验证
- 沙箱内跑无头 Chrome：GPU 进程起不来（`GPU process exited unexpectedly: exit_code=6`），`Page.captureScreenshot` 会超时，`--no-sandbox` 也救不回来。
- 可行做法：`e2e`（已 `npm ci`）里的 Playwright 驱动**本机 Chrome**，`chromium.launch({ channel:'chrome', headless:true, args:['--no-sandbox','--disable-gpu-sandbox'] })`，且整条命令要 `dangerouslyDisableSandbox: true`。首屏 `page.screenshot()` 能出图，WebGL2 正常。
- 内存只有 8GB：同时加载多个 40MB+ 的 GLB 会被 OOM kill（137），逐个加载或按需加载即可。
- 判断拖拽类交互进度时别靠固定位移，直接读 `#task-progress-fill` 的 `style.width` 控制停在中间态。
- GLB 用 `gltf-transform`/Draco 前先看 `bufferViews` 是否真有冗余：曾遇到 44MB 文件其实是重复导出，换成 7MB 版本即可，不必压缩。
