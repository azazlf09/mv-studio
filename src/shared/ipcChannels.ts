export const IPC = {
  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_TEST: 'settings:test',
  SETTINGS_PICK_DIR: 'settings:pickDir',

  // Project
  PROJECT_LIST: 'project:list',
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_SAVE: 'project:save',
  PROJECT_PICK_FILE: 'project:pickFile',
  PROJECT_DELETE: 'project:delete',

  // Image upload (writes to project's refs/ dir, returns ImageRef)
  IMAGE_IMPORT: 'image:import',
  IMAGE_LOAD: 'image:load',

  // Claude
  CLAUDE_GENERATE_CONCEPTS: 'claude:generateConcepts',
  CLAUDE_GENERATE_STORYBOARDS: 'claude:generateStoryboards',
  CLAUDE_STREAM_CHUNK: 'claude:streamChunk',
  CLAUDE_STREAM_DONE: 'claude:streamDone',
  CLAUDE_STREAM_ERROR: 'claude:streamError',

  // Export
  EXPORT_TEXT: 'export:text'
} as const

export type ImportImageArgs = {
  projectPath: string
  kind: 'character' | 'costume'
  label: string
  fileBase64: string  // 'data:image/png;base64,xxx' or raw base64
  filenameHint?: string
}

export type GenerateConceptsArgs = {
  projectPath: string
  lyrics: string
  mood: string
  elements: string[]
  characterRefIds: string[]   // resolved by main process to file paths within project
  requestId?: string
}

export type GenerateStoryboardsArgs = {
  projectPath: string
  lyrics: string
  mood: string
  elements: string[]
  selectedConcept: any        // ConceptDesign
  costumeRefs: { id: string; label: string }[]
  requestId: string
}

export type StreamChunkPayload = {
  requestId: string
  delta: string
  accumulated: string
}
