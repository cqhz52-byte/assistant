# MedDevice AI Studio

医疗器械研发与注册 AI 平台原型，包含：

- 前端：React + Vite
- 后端接口：Vercel Functions（`api/` 目录）
- 本地后端（可选）：Node 服务（`server/index.js`）

## 线上能力说明

当前版本在 Vercel 上可实现：

- 后台登录（演示账号）
- 拉取初始化数据（项目、文档、活动流）
- 新建项目
- AI 建议生成（结构化返回）
- 文档导入（演示元数据）
- 网页实时展示“程序执行结果”

说明：Vercel Functions 默认是无状态/短生命周期，当前数据存储为内存级演示，不适合生产持久化。

## 本地运行

安装依赖：

```bash
npm install
```

启动前端开发：

```bash
npm run dev
```

如需本地 Node 后端联调（可选）：

```bash
npm run dev:server
```

## 部署到 Vercel（推荐）

1. 将代码推送到 GitHub 仓库。
2. 在 Vercel 中 `Add New Project`，选择该仓库导入。
3. Framework 选择 `Vite`（仓库已提供 `vercel.json`）。
4. 点击 `Deploy`。
5. 部署完成后访问域名，点击“进入后台”即可演示登录和操作流程。

## 演示账号

- 邮箱：`demo@meddevice-ai.com`
- 密码：`123456`

## 下一步升级建议（生产化）

1. 接入 PostgreSQL（Supabase/Neon）
2. 接入对象存储（Vercel Blob / S3）
3. 接入真实模型 API（OpenAI）
4. 增加 RBAC 权限和审计日志
5. 增加任务队列与异步文档处理
