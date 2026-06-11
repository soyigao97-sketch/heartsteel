/**
 * Supabase Storage 适配器
 *
 * 使用方法：
 * 1. 将本文件复制到 server/src/utils/supabaseStorage.ts
 * 2. 安装依赖：npm install @supabase/supabase-js
 * 3. 修改 server/src/routes/upload.ts 使用本模块
 * 4. 确保 .env 中有 SUPABASE_URL、SUPABASE_SERVICE_KEY、SUPABASE_STORAGE_BUCKET
 */

import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'heartsteel-images'

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * 上传图片到 Supabase Storage
 * @param fileBuffer - 文件 Buffer
 * @param originalName - 原始文件名
 * @param mimeType - MIME 类型
 * @returns 公开访问 URL
 */
export async function uploadToSupabase(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  const ext = path.extname(originalName)
  const fileName = `${uuidv4()}${ext}`

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType: mimeType,
      cacheControl: '31536000', // 1年缓存
      upsert: false,
    })

  if (error) {
    console.error('Supabase upload error:', error)
    throw new Error('上传失败: ' + error.message)
  }

  // 返回公开 URL
  const { data: publicUrl } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName)

  return publicUrl.publicUrl
}

/**
 * 从 Supabase Storage 删除文件
 * @param url - 文件的公开 URL
 */
export async function deleteFromSupabase(url: string): Promise<void> {
  // 从 URL 中提取文件名
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/')
  const fileName = pathParts[pathParts.length - 1]

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([fileName])

  if (error) {
    console.error('Supabase delete error:', error)
  }
}
