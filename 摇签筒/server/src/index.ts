import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { config } from './config';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import recordRoutes from './routes/records';
import teamRoutes from './routes/teams';
import dynamicRoutes from './routes/dynamics';
import chatRoutes from './routes/chat';
import uploadRoutes from './routes/upload';
import adminRoutes from './routes/admin';
import reportRoutes from './routes/reports';
import followRoutes from './routes/follow';
import { setupChatHandlers } from './socket/chatHandler';
import { startRankingRefreshJob } from './jobs/rankingRefresh';

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
  },
});

// 中间件
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件（上传的图片）
app.use('/uploads', express.static(path.resolve(config.upload.dir)));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/dynamics', dynamicRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/follow', followRoutes);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket
setupChatHandlers(io);

// 定时任务
startRankingRefreshJob();

// 启动
server.listen(config.port, () => {
  console.log(`[Server] 心之钢服务器已启动: http://localhost:${config.port}`);
  console.log(`[Server] WebSocket 已就绪`);
  console.log(`[Server] CORS origin: ${config.cors.origin}`);
});

export default app;
