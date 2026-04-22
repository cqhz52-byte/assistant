# Curaway Clinical Case Support

面向医疗器械临床跟台场景的响应式 Web App，支持：

- Curaway 品牌化移动端界面
- 产品线模板录入
- IndexedDB 本地草稿缓存
- Supabase 在线登录
- Supabase 在线病例数据库
- 本地演示模式回退

当前已支持的主要产品线：

- CT 引导下穿刺导航机器人
- IRE 陡脉冲治疗系统
- 射频消融治疗系统
- 活检穿刺系统
- 静脉射频腔内闭合系统
- 高频电刀系统
- 神经热凝治疗系统

## 技术栈

- 前端：React 19 + Vite
- 样式：自定义品牌化 CSS
- 在线数据库与登录：Supabase
- 本地演示后端：Node `server/index.js`
- Vercel Functions：`api/` 目录

## 本地运行

安装依赖：

```bash
npm install
```

启动前端：

```bash
npm run dev
```

如需本地 Node 演示接口：

```bash
npm run dev:server
```

## Supabase 接入

### 1. 创建 Supabase 项目

在 Supabase 控制台新建项目后，获取：

- `Project URL`
- `Publishable key` 或 `Anon key`

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入：

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

### 3. 执行数据库 SQL

将 [supabase/schema.sql](D:/Python/codex-app/supabase/schema.sql) 的内容复制到 Supabase SQL Editor 执行。

这份 SQL 会完成：

- `profiles` 用户资料表
- `hospitals` 医院表
- `devices` 设备表
- `clinical_cases` 病例表
- 新用户自动建档触发器
- RLS 权限策略
- 初始化医院和设备种子数据

### 4. 登录方式

前端已集成：

- 邮箱 + 密码登录
- 邮箱 + 密码注册

注册时会把 `name` 和 `role` 写入 `auth.users.raw_user_meta_data`，并由触发器同步到 `profiles`。

## 当前运行模式

系统有两种模式：

### Supabase 在线模式

当检测到以下环境变量时自动启用：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

此时：

- 页面先进入登录界面
- 登录后从 Supabase 读取病例
- 提交跟台记录会写入 `clinical_cases`

### 本地演示模式

如果未配置 Supabase 环境变量：

- 不强制登录
- 自动使用演示账号进入系统
- 数据走本地 `api/` 和 `server/db.json`

这样便于本地开发和无网演示。

## 主要目录

- [src/App.jsx](D:/Python/codex-app/src/App.jsx)
  - 主界面、登录流程、病例录入
- [src/lib/caseSupportService.js](D:/Python/codex-app/src/lib/caseSupportService.js)
  - Supabase / 本地双模式数据服务
- [src/lib/supabaseClient.js](D:/Python/codex-app/src/lib/supabaseClient.js)
  - Supabase 客户端初始化
- [src/lib/clinicalData.js](D:/Python/codex-app/src/lib/clinicalData.js)
  - 产品线、设备、医院、快捷模板
- [supabase/schema.sql](D:/Python/codex-app/supabase/schema.sql)
  - Supabase 表结构、RLS、触发器、种子数据

## 部署到 Vercel

1. 将仓库导入 Vercel
2. Framework 选择 `Vite`
3. 在 Vercel 项目中设置环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. 触发部署

如果你需要，我可以下一步继续帮你：

- 把病例图片上传接到 Supabase Storage
- 增加管理员视角的病例筛选和统计
- 接入真实的医院 / 产品 / 耗材后台管理
