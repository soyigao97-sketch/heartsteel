# 心之钢 → Supabase 部署指南（逐一点击版）

---

## 第一步：注册 Supabase 账号

1. 浏览器打开 `https://supabase.com`
2. 点击右上角绿色按钮 **「Sign In」**
3. 选择 **「Continue with GitHub」**（用 GitHub 登录最方便，没有的话注册一个 GitHub 账号）
4. 授权后自动进入 Supabase Dashboard（控制台）

---

## 第二步：创建项目

1. 在 Dashboard 页面，点击右上角黄色按钮 **「New project」**
2. 弹出一个表单，依次填写：

   | 字段 | 填什么 | 示例 |
   |------|--------|------|
   | **Name** | 项目名称 | `heartsteel` |
   | **Database Password** | 设置数据库密码（务必记住！） | `HeartSteel2024!` |
   | **Region** | 选离中国最近的 | `Asia Pacific (Seoul)` 或 `Southeast Asia (Singapore)` |

3. 点击底部绿色按钮 **「Create new project」**
4. 等待 1-2 分钟，页面会显示 Loading 动画，直到出现 "Project created!" 提示

---

## 第三步：获取数据库连接信息

1. 项目创建完成后，你会进入项目 Dashboard（左侧有菜单栏的页面）
2. 左侧菜单栏 → 点击 **「Settings」**（齿轮图标，在最下面）
3. 在 Settings 子菜单中 → 点击 **「Database」**
4. 往下滚动，找到 **「Connection string」** 区域
5. 你会看到一个长框，里面是类似这样的字符串：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxx.supabase.co:5432/postgres
   ```
6. 点击右侧的 **「Copy」** 按钮复制这个连接字符串
7. 注意：字符串中的 `[YOUR-PASSWORD]` 要替换成你第二步设置的密码

---

## 第四步：获取 API Keys

1. 左侧菜单栏 → 点击 **「Settings」**（齿轮图标）
2. Settings 子菜单 → 点击 **「API」**
3. 你会看到两个 Key：

   | Key 名称 | 位置 | 用途 |
   |----------|------|------|
   | **anon public** | 页面顶部，直接可见 | 前端匿名请求 |
   | **service_role** | 需要点击「Reveal」按钮 | 后端管理员操作（保密！） |

4. 记下这两个值：
   - **Project URL**（项目地址）：`https://xxxxxxxxxxxx.supabase.co`
   - **anon public key**：以 `eyJhbGciOiJIUzI1NiJ9...` 开头的一长串
   - **service_role key**：点击 JWT Secret 旁边的「Reveal」查看，同样一长串

---

## 第五步：配置环境变量

1. 打开本地的 `deploy-supabase/.env.supabase` 文件
2. 填入你获取的信息：

```env
# 替换整个连接字符串（密码换成你自己的）：
DATABASE_URL="postgresql://postgres:你的密码@db.你的项目ID.supabase.co:5432/postgres"

# 替换为你第四步获得的 URL 和 Key：
SUPABASE_URL="https://你的项目ID.supabase.co"
SUPABASE_ANON_KEY="你复制的 anon key"
SUPABASE_SERVICE_KEY="你复制的 service_role key"
```

3. 保存文件
4. 把这个文件复制到 server 目录：
   ```
   cp deploy-supabase/.env.supabase server/.env
   ```

---

## 第六步：推送数据库表结构

1. 打开终端，进入 server 目录：
   ```bash
   cd server
   ```

2. 用 Supabase 的 PostgreSQL Schema 替换当前的 SQLite Schema：
   ```bash
   cp ../deploy-supabase/schema.prisma prisma/schema.prisma
   ```

3. 安装依赖（如果还没装）：
   ```bash
   npm install
   ```

4. 生成 Prisma Client：
   ```bash
   npx prisma generate
   ```

5. 推送表结构到 Supabase：
   ```bash
   npx prisma db push
   ```

6. 看到 `Your database is now in sync` 即成功
7. 验证：回到 Supabase Dashboard → 左侧菜单 **「Table Editor」** → 你应该能看到所有表格（users, records, dynamics 等）

---

## 第七步：创建图片存储 Bucket

1. Supabase Dashboard → 左侧菜单 → 点击 **「Storage」**（文件夹图标）
2. 点击页面中间的 **「New bucket」** 按钮
3. 弹窗中填写：
   - **Name of bucket**：`heartsteel-images`
   - **Public bucket**：✅ 勾选（允许图片公开访问）
4. 点击 **「Save」**

5. 设置访问权限（非常重要！）：
   - 左侧菜单 → 点击 **「SQL Editor」**（数据库图标上面那个）
   - 点击 **「New query」**
   - 把下面这段 SQL 粘贴进去：

   ```sql
   -- 允许任何人查看图片
   CREATE POLICY "Public read access"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'heartsteel-images');

   -- 允许任何人上传图片（因为我们的应用自己验证用户身份）
   CREATE POLICY "Anyone can upload"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'heartsteel-images');
   ```

   - 点击右下角绿色按钮 **「Run」** 执行
   - 看到 `Success. No rows returned` 即成功

---

## 第八步：配置 Supabase Storage（后端代码）

1. 安装 Supabase 客户端：
   ```bash
   cd server
   npm install @supabase/supabase-js
   ```

2. 复制存储工具到项目中：
   ```bash
   cp ../deploy-supabase/supabase-storage.ts src/utils/supabaseStorage.ts
   ```

3. 替换上传路由（从本地存储 → Supabase 存储）：
   ```bash
   cp ../deploy-supabase/upload-route-patch.ts src/routes/upload.ts
   ```

---

## 第九步：本地测试

1. 启动后端：
   ```bash
   cd server
   npm run dev
   ```

2. 启动前端：
   ```bash
   cd client
   npm run dev
   ```

3. 浏览器打开 `http://localhost:5173`
4. 注册一个账号 → 上传头像 → 发布带图片的动态
5. 回到 Supabase Dashboard → Storage → `heartsteel-images` → 应该能看到你上传的图片

---

## 第十步：部署上线

### 后端部署（Railway）

1. 把项目 push 到 GitHub
2. 打开 `railway.app` → 用 GitHub 登录
3. 点击 **「New Project」→「Deploy from GitHub repo」**
4. 选择你的仓库
5. 在项目设置中添加环境变量（`server/.env` 中的全部内容）
6. Root Directory 设为 `server`
7. Start Command: `npm start`
8. 部署完成后记下后端地址（如 `https://xxx.up.railway.app`）

### 前端部署（Vercel）

1. 打开 `vercel.com` → 用 GitHub 登录
2. 点击 **「Add New」→「Project」**
3. 选择你的仓库
4. Root Directory 设为 `client`
5. Build Command: `npm run build`
6. 环境变量添加：
   - `VITE_API_URL` = 你的 Railway 后端地址
7. 点击 **「Deploy」**
8. 部署完成后获得前端域名（如 `https://xxx.vercel.app`）

### 更新后端 CORS

修改 `server/.env` 中的 `CORS_ORIGIN` 为 Vercel 前端域名：
```
CORS_ORIGIN="https://你的前端.vercel.app"
```

---

## 快速检查清单

- [ ] Supabase 项目已创建
- [ ] 数据库连接串已填入 `server/.env`
- [ ] `prisma db push` 执行成功
- [ ] Table Editor 中能看到所有表
- [ ] Storage bucket `heartsteel-images` 已创建并设为公开
- [ ] SQL Editor 中执行了权限策略
- [ ] 本地测试注册/登录/上传图片均正常
- [ ] 项目已 push 到 GitHub
- [ ] Railway 后端 + Vercel 前端已部署
- [ ] CORS 已配置为前端域名
