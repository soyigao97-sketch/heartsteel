// 英雄联盟国服大区数据

export interface LolServer {
  name: string
  parent?: string
  description?: string
}

// 独立大区
export const INDEPENDENT_SERVERS: LolServer[] = [
  { name: '艾欧尼亚', description: '电信 1' },
  { name: '黑色玫瑰', description: '电信 10' },
]

// 联盟大区
export const UNION_SERVERS: { name: string; children: LolServer[] }[] = [
  {
    name: '联盟一区',
    children: [
      { name: '祖安', parent: '联盟一区' },
      { name: '皮尔特沃夫', parent: '联盟一区' },
      { name: '巨神峰', parent: '联盟一区' },
      { name: '教育网', parent: '联盟一区' },
      { name: '男爵领域', parent: '联盟一区' },
      { name: '均衡教派', parent: '联盟一区' },
      { name: '影流', parent: '联盟一区' },
      { name: '守望之海', parent: '联盟一区' },
    ],
  },
  {
    name: '联盟二区',
    children: [
      { name: '卡拉曼达', parent: '联盟二区' },
      { name: '暗影岛', parent: '联盟二区' },
      { name: '征服之海', parent: '联盟二区' },
      { name: '诺克萨斯', parent: '联盟二区' },
      { name: '战争学院', parent: '联盟二区' },
      { name: '雷瑟守备', parent: '联盟二区' },
    ],
  },
  {
    name: '联盟三区',
    children: [
      { name: '班德尔城', parent: '联盟三区' },
      { name: '裁决之地', parent: '联盟三区' },
      { name: '水晶之痕', parent: '联盟三区' },
      { name: '钢铁烈阳', parent: '联盟三区' },
      { name: '皮城警备', parent: '联盟三区' },
    ],
  },
  {
    name: '联盟四区',
    children: [
      { name: '比尔吉沃特', parent: '联盟四区' },
      { name: '弗雷尔卓德', parent: '联盟四区' },
      { name: '扭曲丛林', parent: '联盟四区' },
    ],
  },
  {
    name: '联盟五区',
    children: [
      { name: '德玛西亚', parent: '联盟五区' },
      { name: '无畏先锋', parent: '联盟五区' },
      { name: '恕瑞玛', parent: '联盟五区' },
      { name: '巨龙之巢', parent: '联盟五区' },
    ],
  },
]

// 全部服务器扁平列表
export const ALL_SERVERS: { name: string; group: string; desc?: string }[] = [
  ...INDEPENDENT_SERVERS.map(s => ({ name: s.name, group: '独立大区', desc: s.description })),
  ...UNION_SERVERS.flatMap(u =>
    u.children.map(c => ({ name: c.name, group: u.name, desc: undefined }))
  ),
]

// 获取服务器所属的联盟大区
export function getServerGroup(serverName: string): string | null {
  const found = ALL_SERVERS.find(s => s.name === serverName)
  return found?.group || null
}
