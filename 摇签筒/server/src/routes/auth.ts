import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../models/prisma';
import { config } from '../config';
import { authRequired } from '../middleware/auth';
import { addLayer } from '../services/layerService';

const router = Router();

// 手机号格式验证
const registerSchema = z.object({
  phone: z.string().min(1, '请输入手机号'),
  email: z.string().optional().or(z.literal('')),
  password: z.string().min(6, '密码至少6位'),
  nickname: z.string().min(1, '昵称不能为空').max(50, '昵称最多50字'),
});

const loginSchema = z.object({
  phone: z.string().min(1, '请输入手机号'),
  password: z.string().min(1, '请输入密码'),
});

function generateTokens(userId: number, nickname: string) {
  const accessToken = jwt.sign(
    { userId, nickname },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any }
  );
  const refreshToken = jwt.sign(
    { userId, nickname },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as any }
  );
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) {
      res.status(400).json({ error: '该手机号已被注册' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        phone: data.phone,
        email: data.email || null,
        passwordHash,
        nickname: data.nickname,
      },
    });

    // 新用户赠送5层
    await prisma.user.update({ where: { id: user.id }, data: { heartLayer: 5 } });
    await prisma.layerLog.create({ data: { userId: user.id, changeAmount: 5, reason: 'welcome' } });

    const tokens = generateTokens(user.id, user.nickname);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    res.status(201).json({
      user: { id: user.id, nickname: user.nickname, avatarUrl: user.avatarUrl, heartLayer: 5 },
      ...tokens,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (!user) { res.status(400).json({ error: '手机号或密码错误' }); return; }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) { res.status(400).json({ error: '手机号或密码错误' }); return; }

    const tokens = generateTokens(user.id, user.nickname);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    res.json({
      user: { id: user.id, nickname: user.nickname, avatarUrl: user.avatarUrl, heartLayer: user.heartLayer, isAdmin: user.isAdmin },
      ...tokens,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) { res.status(400).json({ error: '缺少 refreshToken' }); return; }

  try {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) { res.status(401).json({ error: 'refreshToken 无效或已过期' }); return; }

    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = generateTokens(payload.userId, payload.nickname);
    await prisma.refreshToken.create({
      data: { userId: payload.userId, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'refreshToken 无效' });
  }
});

// GET /api/auth/me
router.get('/me', authRequired, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, nickname: true, avatarUrl: true, heartLayer: true, gameRegion: true, gameName: true, location: true, phone: true, email: true, wechatId: true, totalSignDays: true, isAdmin: true, createdAt: true },
  });
  res.json(user);
});

export default router;
