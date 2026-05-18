import { create } from 'zustand'
import { normalizeProject, type ProjectData } from '../../../shared/schema'

type ProjectState = {
  projectPath: string | null
  data: ProjectData | null
  dirty: boolean
  setProject: (path: string, data: ProjectData) => void
  updateData: (mutator: (d: ProjectData) => void) => void
  markSaved: () => void
  reset: () => void
}

export const useProject = create<ProjectState>((set, get) => ({
  projectPath: null,
  data: null,
  dirty: false,
  setProject: (path, data) => set({ projectPath: path, data: normalizeProject(data), dirty: false }),
  updateData: (mutator) => {
    const cur = get().data
    if (!cur) return
    const next = JSON.parse(JSON.stringify(cur)) as ProjectData
    mutator(next)
    set({ data: next, dirty: true })
  },
  markSaved: () => set({ dirty: false }),
  reset: () => set({ projectPath: null, data: null, dirty: false })
}))

export async function saveProject(): Promise<void> {
  const { projectPath, data, markSaved } = useProject.getState()
  if (!projectPath || !data) return
  await window.api.project.save(projectPath, data)
  markSaved()
}

// Auto-save on update with debounce
let saveTimer: any = null
useProject.subscribe((state, prev) => {
  if (state.dirty && state.data !== prev.data) {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveProject().catch(console.error), 800)
  }
})
