import { contextBridge, ipcRenderer } from 'electron'
import { IPC, ImportImageArgs, GenerateConceptsArgs, GenerateStoryboardsArgs, StreamChunkPayload } from '../shared/ipcChannels'
import { AppSettings, ProjectData, ImageRef } from '../shared/schema'

const api = {
  settings: {
    get: (): Promise<AppSettings & { apiKeySet: boolean; apiKeyTail: string }> =>
      ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (patch: Partial<AppSettings> & { clearApiKey?: boolean }): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke(IPC.SETTINGS_SET, patch),
    test: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke(IPC.SETTINGS_TEST),
    pickDir: (): Promise<string | null> => ipcRenderer.invoke(IPC.SETTINGS_PICK_DIR)
  },
  project: {
    list: (): Promise<{ id: string; name: string; path: string; lastOpened: string }[]> => ipcRenderer.invoke(IPC.PROJECT_LIST),
    create: (args: { name: string; parentDir: string }) => ipcRenderer.invoke(IPC.PROJECT_CREATE, args),
    open: (projectPath: string) => ipcRenderer.invoke(IPC.PROJECT_OPEN, projectPath),
    save: (projectPath: string, data: ProjectData) => ipcRenderer.invoke(IPC.PROJECT_SAVE, { projectPath, data }),
    pickFile: (): Promise<string | null> => ipcRenderer.invoke(IPC.PROJECT_PICK_FILE),
    delete: (projectPath: string) => ipcRenderer.invoke(IPC.PROJECT_DELETE, projectPath)
  },
  image: {
    import: (args: ImportImageArgs): Promise<ImageRef> => ipcRenderer.invoke(IPC.IMAGE_IMPORT, args),
    load: (args: { projectPath: string; kind: 'character' | 'costume'; filename: string }): Promise<string> =>
      ipcRenderer.invoke(IPC.IMAGE_LOAD, args)
  },
  claude: {
    generateConcepts: (args: GenerateConceptsArgs) => ipcRenderer.invoke(IPC.CLAUDE_GENERATE_CONCEPTS, args),
    generateStoryboards: (args: GenerateStoryboardsArgs) => ipcRenderer.invoke(IPC.CLAUDE_GENERATE_STORYBOARDS, args),
    onChunk: (cb: (p: StreamChunkPayload) => void) => {
      const h = (_: any, p: StreamChunkPayload) => cb(p)
      ipcRenderer.on(IPC.CLAUDE_STREAM_CHUNK, h)
      return () => ipcRenderer.removeListener(IPC.CLAUDE_STREAM_CHUNK, h)
    },
    onDone: (cb: (p: { requestId: string; data: any }) => void) => {
      const h = (_: any, p: any) => cb(p)
      ipcRenderer.on(IPC.CLAUDE_STREAM_DONE, h)
      return () => ipcRenderer.removeListener(IPC.CLAUDE_STREAM_DONE, h)
    },
    onError: (cb: (p: { requestId: string; message: string }) => void) => {
      const h = (_: any, p: any) => cb(p)
      ipcRenderer.on(IPC.CLAUDE_STREAM_ERROR, h)
      return () => ipcRenderer.removeListener(IPC.CLAUDE_STREAM_ERROR, h)
    }
  },
  export: {
    text: (args: { defaultName: string; content: string; ext: string }) => ipcRenderer.invoke(IPC.EXPORT_TEXT, args)
  },
  debug: {
    onLog: (cb: (evt: any) => void) => {
      const h = (_: any, evt: any) => cb(evt)
      ipcRenderer.on('debug:log', h)
      return () => ipcRenderer.removeListener('debug:log', h)
    },
    getHistory: (): Promise<any[]> => ipcRenderer.invoke('debug:getHistory'),
    clear: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('debug:clear')
  },
  app: {
    /** 由 main 通过 globalShortcut Ctrl+` 转发：让 renderer 切换 DebugDrawer 可见性 */
    onToggleDebugDrawer: (cb: () => void) => {
      const h = () => cb()
      ipcRenderer.on('app:toggle-debug-drawer', h)
      return () => ipcRenderer.removeListener('app:toggle-debug-drawer', h)
    },
    /** 检测 Claude Code CLI 是否可用 */
    detectCli: (): Promise<{ found: boolean; version?: string; path?: string; error?: string }> =>
      ipcRenderer.invoke('app:detectCli'),
    /** 用内置 demo 数据创建一个示例项目并返回路径 + 数据 */
    createDemoProject: (parentDir?: string): Promise<{ ok: boolean; projectPath?: string; data?: any; message?: string }> =>
      ipcRenderer.invoke('app:createDemoProject', parentDir),
    /** 在系统默认浏览器打开链接 */
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
declare global {
  interface Window { api: Api }
}
