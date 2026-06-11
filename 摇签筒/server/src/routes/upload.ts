/**
 * 替换 server/src/routes/upload.ts 为此文件
 * 用于将本地文件上传切换为 Supabase Storage
 *
 * 安装依赖：npm install @supabase/supabase-js
 */

import { Router, Request, Response } from 'express';
import { authRequired } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadToSupabase } from '../utils/supabaseStorage';
import fs from 'fs';

const router = Router();

// POST /api/upload - 上传图片到 Supabase Storage
router.post('/', authRequired, upload.array('images', 9), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: '请选择文件' });
    return;
  }

  try {
    const urls: string[] = [];
    for (const file of files) {
      const buffer = fs.readFileSync(file.path);
      const url = await uploadToSupabase(buffer, file.originalname, file.mimetype);
      urls.push(url);
      // 删除临时文件
      fs.unlinkSync(file.path);
    }
    res.json({ urls });
  } catch (err: any) {
    console.error('Upload error:', err);
    // 清理临时文件
    files.forEach(f => { try { fs.unlinkSync(f.path) } catch {} });
    res.status(500).json({ error: '上传失败: ' + (err.message || '未知错误') });
  }
});

export default router;
