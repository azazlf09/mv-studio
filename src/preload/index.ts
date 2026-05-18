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
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
declare global {
  interface Window { api: Api }
}
