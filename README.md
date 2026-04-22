# Curaway Clinical Case Support

面向医疗器械临床跟台场景的响应式 Web App，现已切换为“公司内部服务器 + Python API + 自建数据库”架构。

当前覆盖的主要产品线：

- CT引导下穿刺导航机器人
- IRE陡脉冲治疗系统
- 射频消融治疗系统
- 活检穿刺系统
- 静脉射频腔内闭合系统
- 高频电刀系统
- 神经热凝治疗系统

## 技术栈

- 前端：React 19 + Vite
- 界面：品牌化 CSS，移动端优先
- 后端：FastAPI + SQLAlchemy + JWT
- 数据库：PostgreSQL
- 本地草稿：IndexedDB / localStorage fallback
- 部署：公司内网服务器或 Docker

## 目录说明

- [src/App.jsx](D:/Python/codex-app/src/App.jsx)
  - 主界面、登录流程、分步跟台表单
- [src/lib/caseSupportService.js](D:/Python/codex-app/src/lib/caseSupportService.js)
  - 公司服务器 API、登录态与病例提交
- [backend/main.py](D:/Python/codex-app/backend/main.py)
  - FastAPI 接口入口
- [backend/models.py](D:/Python/codex-app/backend/models.py)
  - SQLAlchemy 数据模型
- [backend/sql/schema.sql](D:/Python/codex-app/backend/sql/schema.sql)
  - PostgreSQL 初始化脚本
- [deploy/docker-compose.yml](D:/Python/codex-app/deploy/docker-compose.yml)
  - 公司服务器 Docker 编排示例

## 前端启动

安装依赖：

```bash
npm install
```

启动前端：

```bash
npm run dev
```

默认会把 `/api` 代理到本地 `8000` 端口。

## Python 后端启动

安装 Python 依赖：

```bash
pip install -r backend/requirements.txt
```

启动 API：

```bash
npm run dev:server
```

或直接运行：

```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## 环境变量

复制根目录 [.env.example](D:/Python/codex-app/.env.example) 到 `.env`，至少配置：

```bash
VITE_API_BASE_URL=https://case.yourcompany.com/api
DATABASE_URL=postgresql+psycopg://case_user:change_me@127.0.0.1:5432/case_support
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGINS=http://localhost:5173,https://case.yourcompany.com
```

说明：

- `VITE_API_BASE_URL`
  - 手机端和浏览器访问的 API 地址
- `DATABASE_URL`
  - 公司服务器 PostgreSQL 连接串
- `JWT_SECRET`
  - 登录 token 的签名密钥
- `CORS_ORIGINS`
  - 允许访问 API 的前端域名

## 数据库初始化

如果你直接使用 PostgreSQL，可执行：

```bash
psql "$DATABASE_URL" -f backend/sql/schema.sql
```

这份脚本会创建：

- `users`
- `hospitals`
- `devices`
- `clinical_cases`
- `case_details`
- `consumables`
- `media`

并自动写入一批常用医院和设备主数据。

## Docker 部署

如果公司服务器已安装 Docker，可直接使用：

```bash
cd deploy
docker compose up -d --build
```

这会启动：

- PostgreSQL 数据库
- FastAPI 病例服务

默认开放端口：

- `5432`
- `8000`

## 当前能力

- 邮箱密码注册 / 登录
- JWT 登录态管理
- 4 步分步跟台录入
- 按产品线动态切换参数模板
- 耗材模板快速套用
- 草稿离线缓存
- 病例、耗材、附件元数据写入公司数据库

## 下一步可继续扩展

- 对接公司文件服务器或对象存储，真正上传图片和视频
- 接入扫码枪 / OCR，自动录入耗材批号
- 增加管理员端统计报表和区域筛选
- 增加医院、医生、产品、耗材后台主数据管理
