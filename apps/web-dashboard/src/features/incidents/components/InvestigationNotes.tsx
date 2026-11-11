import { FilePlus2, NotebookPen } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import type { Incident, InvestigationNote } from '../../../types'
import { formatDateTime } from '../../../utils/formatters'

interface InvestigationNotesProps {
  incident: Incident
  notes: readonly InvestigationNote[]
  onAddNote: (content: string) => Promise<void>
}

export function InvestigationNotes({ incident, notes, onAddNote }: InvestigationNotesProps) {
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit() {
    if (!content.trim()) { setError('Investigation note content is required.'); return }
    setIsSaving(true)
    try {
      await onAddNote(content)
      setContent('')
      setError(null)
      setIsSaving(false)
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Note could not be saved.')
      setIsSaving(false)
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <NotebookPen aria-hidden="true" className="size-4 text-violet-300" />
        <h3 className="text-sm font-semibold text-slate-200">Investigation notes</h3>
      </div>
      <div className="mt-4 space-y-3">
        {notes.length > 0 ? notes.map((note) => (
          <article className="rounded-lg border border-slate-800 bg-slate-950/25 p-3" key={note.id}>
            <p className="text-xs leading-5 text-slate-300">{note.content}</p>
            <p className="mt-2 text-[0.625rem] text-slate-600">{note.authorName} · {formatDateTime(note.timestamp)} · MOCK</p>
          </article>
        )) : <p className="text-xs text-slate-600">No investigation notes have been added.</p>}
      </div>
      {incident.status === 'investigating' ? (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
          <label className="text-xs font-medium text-slate-300">
            Add investigation note
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400/60"
              onChange={(event) => { setContent(event.target.value); setError(null) }}
              placeholder="Record observations without overwriting previous notes."
              value={content}
            />
          </label>
          {error ? <p className="mt-1 text-xs text-rose-300" role="alert">{error}</p> : null}
          <div className="mt-2 flex justify-end">
            <Button disabled={isSaving} onClick={submit} size="small">
              <FilePlus2 aria-hidden="true" className="size-3.5" />
              {isSaving ? 'Adding…' : 'Add Note'}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
