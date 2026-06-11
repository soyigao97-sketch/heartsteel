# 心之钢 · 海克斯大乱斗交友站

基于英雄联盟海克斯大乱斗模式的组队交友网站。核心特色：用户活跃度由"心之钢层数"量化，层数越高，发布内容的推流权重和视觉占位越大。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS |
| 后端 | Node.js + Express + Socket.io |
| ORM | Prisma (PostgreSQL) |
| 缓存 | Redis |
| 认证 | JWT |

## 快速启动

### 1. 启动依赖服务

```bash
docker-compose up -d
```

启动 PostgreSQL（端口 5432）和 Redis（端口 6379）。

### 2. 初始化数据库

```bash
cd server
cp .env .env.local   # 如需自定义配置
npx prisma db push   # 同步数据库结构
```

### 3. 启动后端

```bash
cd server
npm run dev          # http://localhost:3001
```

### 4. 启动前端

```bash
cd client
npm run dev          # http://localhost:5173
```

## 项目结构

```
摇签筒/
├── client/                # React 前端
│   └── src/
│       ├── components/    # 组件 (ui/, layout/, card/, chat/)
│       ├── pages/         # 页面 (HomePage, TeamHallPage, ChatPage, ProfilePage, AdminPage)
│       ├── stores/        # Zustand 状态管理
│       ├── services/      # API 封装
│       ├── hooks/         # 自定义 hooks
│       ├── utils/         # 工具函数
│       └── types/         # TypeScript 类型
├── server/                # Express 后端
│   ├── prisma/            # 数据库 Schema
│   └── src/
│       ├── routes/        # API 路由 (auth, user, records, teams, dynamics, chat, admin)
│       ├── services/      # 业务逻辑 (layerService, rankingService)
│       ├── middleware/     # 中间件 (auth, upload)
│       ├── socket/        # WebSocket 聊天处理
│       ├── jobs/          # 定时任务 (推流刷新)
│       └── models/        # Prisma Client
├── docker-compose.yml     # 基础设施
└── README.md
```

## 功能模块

1. **用户系统** - 注册/登录，JWT 双 Token 认证
2. **心之钢层数** - 签到/发动态/发战绩/组队成功 均可增加层数，每日上限控制（Redis）
3. **战绩广场** - 瀑布流展示，推流算法排序，点赞评论
4. **组队大厅** - 发布/加入队伍，自动创建临时群聊（24h 归档）
5. **实时聊天** - WebSocket 私聊 + 群聊，消息持久化
6. **个人主页** - 层数展示，签到，动态发布，游戏信息绑定
7. **管理后台** - 举报审核，内容下架，层数手动调整

## 层数等级

| 层数 | 称号 | CSS 效果 |
|------|------|----------|
| 0-9 | 初钢 | 普通灰卡 |
| 10-49 | 锻钢 | 浅灰渐变 + 微光 |
| 50-199 | 精钢 | 银色金属边框 |
| 200-499 | 心之钢 | 金色边框 + 跳动光效 |
| 500+ | 不灭心钢 | 彩虹渐变边框 |

## API 端点

```
POST /api/auth/register    注册
POST /api/auth/login       登录
POST /api/auth/refresh     刷新 Token
GET  /api/auth/me          当前用户

POST /api/user/sign        每日签到
GET  /api/user/profile/:id 用户主页
PUT  /api/user/profile     更新资料

GET  /api/records          战绩列表
POST /api/records          发布战绩
POST /api/records/:id/like 点赞
POST /api/records/:id/comment 评论

GET  /api/teams            组队列表
POST /api/teams            发布组队
POST /api/teams/:id/join   加入队伍

POST /api/dynamics         发布动态
GET  /api/dynamics         动态列表

GET  /api/chat/rooms       聊天室列表
GET  /api/chat/messages/:id 聊天记录
POST /api/chat/private     创建私聊

GET  /api/admin/reports    举报列表 (管理员)
POST /api/admin/adjust-layer 调整层数 (管理员)
```
