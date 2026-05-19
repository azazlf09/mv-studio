export const SCHEMA_VERSION = 1

export type ImageRef = {
  id: string
  filename: string
  label: string
}

export type FaceAnalysis = {
  face_shape: string
  skin_tone: string
  temperament_tags: string[]
}

export type ConceptDesign = {
  id: number
  theme_name: string
  style_direction: string
  makeup: string
  hairstyle: string
  outfit: string
  accessories: string
  scene_atmosphere: string
  color_palette: string[]
  overall_description: string
  ai_image_prompt: string
}

export type Step1Output = {
  face_analysis: FaceAnalysis
  concepts: ConceptDesign[]
}

export type Storyboard = {
  index: number
  lyric: string
  shot_size: string
  angle: string
  camera_movement: string
  perspective: string
  ref_images: string[]
  audio_ref: string
  scene_description: string
}

export type ProjectData = {
  meta: {
    id: string
    name: string
    createdAt: string
    updatedAt: string
    schemaVersion: number
  }
  step1: {
    lyrics: string
    mood: string
    elements: string[]
    characterRefs: ImageRef[]
    faceAnalysis: FaceAnalysis | null
    concepts: ConceptDesign[]
    selectedConceptId: number | null
  }
  step2: {
    costumeRefs: ImageRef[]
    storyboards: Storyboard[]
  }
}

export type ProviderType = 'claude-code-cli' | 'anthropic' | 'openai' | 'gemini' | 'custom'

export type AppSettings = {
  provider: ProviderType
  apiKey: string
  baseUrl: string
  defaultModel: string
  defaultProjectsDir: string
  /** Anthropic 专用：开启后伪装成 Claude Code CLI 发请求，解决只接受 CC 客户端的中转 503 */
  claudeCodeMode: boolean
  /** 自定义 provider 用：附加 HTTP headers（JSON 字符串） */
  customHeaders: string
  /** 自定义 provider 用：协议风格（决定请求体格式） */
  customProtocol: 'anthropic' | 'openai'
  /** Claude Code CLI 专用：claude 可执行文件路径，留空走 PATH */
  cliPath: string
  /** 是否常驻显示调试抽屉浮动按钮（普通用户默认关闭）。关闭时按 Ctrl+` 临时唤起。 */
  debugMode: boolean
  /** 首次启动引导是否已完成；未完成时启动 APP 会自动跳 /welcome */
  onboardingCompleted: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'claude-code-cli',
  apiKey: '',
  baseUrl: 'https://api.anthropic.com',
  defaultModel: 'claude-opus-4-7',
  defaultProjectsDir: '',
  claudeCodeMode: false,
  customHeaders: '',
  customProtocol: 'openai',
  cliPath: '',
  debugMode: false,
  onboardingCompleted: false
}

/** 预设供应商。选中后自动填好 baseUrl、推荐模型，便于一键接入。 */
export type ProviderPreset = {
  id: string
  label: string
  provider: ProviderType
  baseUrl: string
  defaultModel: string
  models: string[]
  /** 备注，在 UI 提示 */
  note?: string
  /** 自定义 provider 时使用的协议风格 */
  protocol?: 'anthropic' | 'openai'
  /** 是否默认开启 Claude Code 兼容模式 */
  claudeCodeMode?: boolean
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'claude-code-cli',
    label: '✨ Claude Code CLI（推荐，零配置，复用已登录账号）',
    provider: 'claude-code-cli',
    baseUrl: '',
    defaultModel: 'claude-opus-4-7',
    models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    note: '调用本地已安装并登录的 claude CLI，无需 API Key，不走任何中转商'
  },
  {
    id: 'anthropic-official',
    label: 'Anthropic 官方',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-opus-4-7',
    models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001']
  },
  {
    id: 'packycode',
    label: 'PackyCode（Claude Code 中转）',
    provider: 'anthropic',
    baseUrl: 'https://api.packycode.com',
    defaultModel: 'claude-opus-4-7',
    models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    note: '只接受 Claude Code 客户端 → 自动开启兼容模式',
    claudeCodeMode: true
  },
  {
    id: 'anyrouter',
    label: 'AnyRouter（CC 中转）',
    provider: 'anthropic',
    baseUrl: 'https://anyrouter.top',
    defaultModel: 'claude-opus-4-7',
    models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    note: '只接受 Claude Code 客户端 → 自动开启兼容模式',
    claudeCodeMode: true
  },
  {
    id: 'openai-official',
    label: 'OpenAI 官方',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o3', 'o4-mini'],
    note: 'Vision 推荐 gpt-4o / gpt-4.1'
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    provider: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    note: '⚠ 不支持图像输入，第一步无法用角色照分析'
  },
  {
    id: 'qwen',
    label: '通义千问（阿里 DashScope 兼容）',
    provider: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-vl-max',
    models: ['qwen-vl-max', 'qwen-vl-plus', 'qwen2.5-vl-72b-instruct', 'qwen-max'],
    note: 'qwen-vl-* 支持视觉'
  },
  {
    id: 'kimi',
    label: 'Kimi（Moonshot）',
    provider: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-32k-vision-preview',
    models: ['moonshot-v1-32k-vision-preview', 'moonshot-v1-128k-vision-preview', 'moonshot-v1-8k'],
    note: '*-vision-preview 才支持图像'
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    provider: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4v-plus',
    models: ['glm-4v-plus', 'glm-4v', 'glm-4-plus']
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow（硅基流动）',
    provider: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2.5-VL-72B-Instruct',
    models: ['Qwen/Qwen2.5-VL-72B-Instruct', 'deepseek-ai/DeepSeek-V3']
  },
  {
    id: 'openrouter',
    label: 'OpenRouter（一个 key 用 100+ 模型）',
    provider: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-opus-4',
    models: [
      'anthropic/claude-opus-4',
      'anthropic/claude-sonnet-4',
      'openai/gpt-4o',
      'google/gemini-2.5-pro',
      'meta-llama/llama-3.3-70b-instruct'
    ],
    note: '模型名格式：vendor/model'
  },
  {
    id: 'gemini-official',
    label: 'Google Gemini',
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-pro',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']
  },
  {
    id: 'custom',
    label: '自定义（手填 baseURL/headers）',
    provider: 'custom',
    baseUrl: '',
    defaultModel: '',
    models: [],
    protocol: 'openai',
    note: '高级：协议风格 + 自定义 headers'
  }
]

export const SHOT_SIZES = ['远景', '全景', '中景', '近景', '特写', '大特写'] as const
export const ANGLES = ['正面', '侧拍', '背拍', '俯拍', '仰拍', '过肩', '平视'] as const
export const CAMERA_MOVEMENTS = [
  '推', '拉', '摇', '移', '跟', '环绕', '希区柯克变焦',
  '手持跟随', '固定机位', '升降', '侧向匀速跟拍', '甩镜', '一镜到底'
] as const
export const PERSPECTIVES = ['第一人称视角', '第三人称视角', '上帝视角'] as const

export function createEmptyProject(name: string, id: string): ProjectData {
  const now = new Date().toISOString()
  return {
    meta: { id, name, createdAt: now, updatedAt: now, schemaVersion: SCHEMA_VERSION },
    step1: {
      lyrics: '',
      mood: '',
      elements: [],
      characterRefs: [],
      faceAnalysis: null,
      concepts: [],
      selectedConceptId: null
    },
    step2: {
      costumeRefs: [],
      storyboards: []
    }
  }
}

/**
 * 把可能从老版本加载的 project.json 补齐到当前 schema。
 * 防止前端访问 undefined 字段崩溃（如 step1.concepts.find 报错）。
 */
export function normalizeProject(raw: any): ProjectData {
  const now = new Date().toISOString()
  const meta = raw?.meta ?? {}
  const s1 = raw?.step1 ?? {}
  const s2 = raw?.step2 ?? {}
  return {
    meta: {
      id: meta.id ?? '',
      name: meta.name ?? '未命名',
      createdAt: meta.createdAt ?? now,
      updatedAt: meta.updatedAt ?? now,
      schemaVersion: typeof meta.schemaVersion === 'number' ? meta.schemaVersion : SCHEMA_VERSION
    },
    step1: {
      lyrics: typeof s1.lyrics === 'string' ? s1.lyrics : '',
      mood: typeof s1.mood === 'string' ? s1.mood : '',
      elements: Array.isArray(s1.elements) ? s1.elements : [],
      characterRefs: Array.isArray(s1.characterRefs) ? s1.characterRefs : [],
      faceAnalysis: s1.faceAnalysis ?? null,
      concepts: Array.isArray(s1.concepts) ? s1.concepts : [],
      selectedConceptId: typeof s1.selectedConceptId === 'number' ? s1.selectedConceptId : null
    },
    step2: {
      costumeRefs: Array.isArray(s2.costumeRefs) ? s2.costumeRefs : [],
      storyboards: Array.isArray(s2.storyboards) ? s2.storyboards : []
    }
  }
}
