// ========== 用户 ==========
export interface User {
  id: number;
  phone?: string;
  nickname: string;
  avatarUrl: string | null;
  heartLayer: number;
  gameRegion?: string;
  gameName?: string;
  location?: string;
  wechatId?: string;
  totalSignDays: number;
  isAdmin?: boolean;
  createdAt: string;
}

export interface UserProfile extends User {
  tier: LayerTier;
  followingCount: number;
  followersCount: number;
  recentRecords: Record[];
  recentDynamics: Dynamic[];
}

export interface FollowUser {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  heartLayer: number;
}

// ========== 层数 ==========
export interface LayerTier {
  title: string;
  cssClass: 'layer-bronze' | 'layer-silver' | 'layer-gold' | 'layer-platinum' | 'layer-diamond';
}

export interface LayerLog {
  id: number;
  userId: number;
  changeAmount: number;
  reason: string;
  createdAt: string;
}

// ========== 战绩 ==========
export interface Record {
  id: number;
  userId: number;
  user?: Pick<User, 'id' | 'nickname' | 'avatarUrl' | 'heartLayer' | 'gameRegion' | 'location'>;
  mode: string;
  kdaKill: number;
  kdaDeath: number;
  kdaAssist: number;
  description?: string;
  images: string[];
  likes: number;
  comments: number;
  status: string;
  rankScore: number;
  createdAt: string;
}

// ========== 组队 ==========
export interface TeamRequest {
  id: number;
  userId: number;
  user?: Pick<User, 'id' | 'nickname' | 'avatarUrl' | 'heartLayer' | 'gameRegion' | 'gameName' | 'location'>;
  mode: string;
  serverRegion?: string;
  requirement?: string;
  needCount: number;
  currentCount: number;
  voiceRequired: boolean;
  scheduleTime?: string;
  groupChatId?: string;
  status: 'open' | 'full' | 'cancelled';
  rankScore: number;
  createdAt: string;
}

// ========== 动态 ==========
export interface Dynamic {
  id: number;
  userId: number;
  user?: Pick<User, 'id' | 'nickname' | 'avatarUrl' | 'heartLayer'>;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  createdAt: string;
}

// ========== 聊天 ==========
export interface ChatRoom {
  id: string;
  type: 'private' | 'group';
  name?: string;
  isArchived: boolean;
  members: Pick<User, 'id' | 'nickname' | 'avatarUrl' | 'heartLayer'>[];
  lastMessage?: Message | null;
  teamReqId?: number;
}

export interface Message {
  id: number;
  chatRoomId: string;
  senderId: number;
  sender?: Pick<User, 'id' | 'nickname' | 'avatarUrl' | 'heartLayer'>;
  messageType: 'text' | 'image';
  content: string;
  createdAt: string;
}

// ========== 评论 ==========
export interface Comment {
  id: number;
  userId: number;
  user?: Pick<User, 'id' | 'nickname' | 'avatarUrl'>;
  targetType: string;
  targetId: number;
  content: string;
  createdAt: string;
}

// ========== 举报 ==========
export interface Report {
  id: number;
  reporterId: number;
  reporter?: Pick<User, 'id' | 'nickname'>;
  targetType: string;
  targetId: number;
  reason: string;
  status: string;
  createdAt: string;
}

// ========== API 响应 ==========
export interface PaginatedResponse<T> {
  records?: T[];
  teams?: T[];
  total: number;
  page: number;
  limit: number;
  hasMore?: boolean;
}

// ========== 签到状态 ==========
export interface SignStatus {
  signed: boolean;
  todayDynamic: boolean;
  todayTeamPost: number;
  todayRecord: number;
  todayInteraction: number;
}
