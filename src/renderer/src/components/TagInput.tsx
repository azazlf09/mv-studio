import { X, Plus } from 'lucide-react'
import { useState, KeyboardEvent } from 'react'

export default function TagInput({
  value, onChange, placeholder
}: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')

  function add() {
    const v = draft.trim()
    if (!v || value.includes(v)) { setDraft(''); return }
    onChange([...value, v])
    setDraft('')
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value.length - 1)
    }
  }

  return (
    <div className="min-h-[42px] w-full rounded-md bg-panel border border-border px-2 py-1.5 flex flex-wrap gap-1.5 items-center focus-within:border-accent transition">
      {value.map((v, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-panel2 text-sm border border-border">
          {v}
          <button onClick={() => remove(i)} className="text-ink2 hover:text-red-400"><X size={12}/></button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={placeholder ?? '回车 / 逗号 添加标签'}
      />
    </div>
  )
}
