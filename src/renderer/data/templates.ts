export type TemplateId = 'ecommerce' | 'photography' | 'poster' | 'creative' | 'art'

export interface Template {
  id: TemplateId
  label: string
  en: string           // 英文小副标
  index: string        // 编号 #01
  text: string
}

export const TEMPLATES: Template[] = [
  {
    id: 'ecommerce',
    label: '电商',
    en: 'E-commerce',
    index: '01',
    text: '主体为 [产品名称]，放置于 [干净简约的背景环境] 中。主光源采用 [柔和的侧前方布光]，重点突出 [产品核心卖点材质]。景深控制得当，背景虚化，4K 超高清，商业摄影质感，干净无杂物。',
  },
  {
    id: 'photography',
    label: '摄影',
    en: 'Photography',
    index: '02',
    text: '[人文/风光/肖像] 摄影风格。主体 [人物/景物] 位于 [具体场景]。自然光为主，[黄金时刻/阴天柔光] 氛围。构图遵循 [三分法/中心对称]，电影级调色，胶片颗粒感，超高细节，写实向。',
  },
  {
    id: 'poster',
    label: '海报',
    en: 'Poster Design',
    index: '03',
    text: '电影海报/宣发封面风格。主体视觉元素为 [核心图标/人物]，背景运用 [渐变色/抽象纹理]。大标题字体位于 [上方/下方]，留白恰当。视觉冲击力强，扁平化与3D融合，适合社交媒体传播。',
  },
  {
    id: 'creative',
    label: '创意',
    en: 'Creative Art',
    index: '04',
    text: '超现实主义数字艺术。主体 [奇幻生物/异形建筑] 漂浮在 [梦境空间] 中。色彩运用 [互补色/霓虹渐变]，融化流淌效果，天马行空的想象力，C4D 渲染，Octane 引擎，8k 极致细节。',
  },
  {
    id: 'art',
    label: '艺术',
    en: 'Fine Art',
    index: '05',
    text: '古典油画/水彩插画风格。描绘 [古典人物/自然风景]。笔触细腻，[暖色调/莫兰迪色系] 主导。富有肌理感和层次感，伦勃朗布光，艺术史参考，博物馆级藏品质感。',
  },
]
