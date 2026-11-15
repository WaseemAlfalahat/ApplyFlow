
import { useEffect, useState, type FormEvent } from 'react'

type Application = {
  id: string
  jobTitle: string
  companyName: string
}

type Details = {
  notes: string | null
  recruiterName: string | null
  recruiterEmail: string | null
  followUpDate: string | null
}

type SavedNote = Application & Details

type Editor = {
  notes: string
  recruiterName: string
  recruiterEmail: string
  followUpDate: string
}

function toEditor(details?: Details): Editor {
  return {
    notes: details?.notes ?? '',
    recruiterName: details?.recruiterName ?? '',
    recruiterEmail: details?.recruiterEmail ?? '',
    followUpDate: details?.followUpDate ?? '',
  }
}

function hasContent(details: Details) {
  return Boolean(
    details.notes?.trim() ||
    details.recruiterName?.trim() ||
    details.recruiterEmail?.trim() ||
    details.followUpDate
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function ApplicationDetailsPanel() {
  const [applications, setApplications] = useState<Application[]>([])
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([])

  const [selectedId, setSelectedId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Editor>(toEditor())

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const [applicationsResponse, notesResponse] =
          await Promise.all([
            fetch('/api/applications', {
              credentials: 'include',
              signal: controller.signal,
            }),
            fetch('/api/applications/notes', {
              credentials: 'include',
              signal: controller.signal,
            }),
          ])

        if (!applicationsResponse.ok || !notesResponse.ok) {
          throw new Error('Could not load application notes.')
        }

        const apps: Application[] =
          await applicationsResponse.json()

        const notes: SavedNote[] = await notesResponse.json()

        if (controller.signal.aborted) return

        setApplications(apps)
        setSavedNotes(notes)
        setSelectedId(notes[0]?.id ?? '')
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load notes.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [])

  const selectedNote = savedNotes.find(
    (note) => note.id === selectedId
  )

  function openEditor(id: string) {
    const existing = savedNotes.find((note) => note.id === id)

    setEditingId(id)
    setDraft(toEditor(existing))
    setEditing(true)
    setError('')
    setNotice('')
  }

  function startAdd() {
    const application =
      applications.find(
        (app) => !savedNotes.some((note) => note.id === app.id)
      ) ?? applications[0]

    if (!application) return

    openEditor(application.id)
  }

  function cancelEdit() {
    setEditing(false)
    setEditingId('')
    setError('')
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const application = applications.find(
      (app) => app.id === editingId
    )

    if (!application) return

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch(
        `/api/applications/${editingId}/details`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notes: draft.notes.trim() || null,
            recruiterName: draft.recruiterName.trim() || null,
            recruiterEmail: draft.recruiterEmail.trim() || null,
            followUpDate: draft.followUpDate || null,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          `Could not save details (${response.status}).`
        )
      }

      const result: Details = await response.json()

      const updated: SavedNote = {
        ...application,
        ...result,
      }

      setSavedNotes((current) => {
        const otherNotes = current.filter(
          (note) => note.id !== editingId
        )

        return hasContent(result)
          ? [updated, ...otherNotes]
          : otherNotes
      })

      setSelectedId(
        hasContent(result)
          ? editingId
          : savedNotes.find((note) => note.id !== editingId)?.id ?? ''
      )

      setEditing(false)
      setEditingId('')
      setNotice(
        hasContent(result)
          ? 'Application details saved successfully.'
          : 'Application details cleared.'
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save application details.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="notes-panel">
      <div className="notes-heading">
        <div>
          <h2>Application Notes & Contacts</h2>
          <p>Keep all your recruiter conversations and notes organized.</p>
        </div>

        <button
          type="button"
          className="notes-primary-button"
          onClick={startAdd}
          disabled={loading || saving || applications.length === 0}
        >
          + Add Notes
        </button>
      </div>

      {notice && (
        <p className="notes-success" role="status">
          {notice}
        </p>
      )}

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="notes-muted">Loading your notes...</p>
      ) : applications.length === 0 ? (
        <div className="notes-empty">
          <h3>No applications yet</h3>
          <p>Add a job application to start taking notes.</p>
        </div>
      ) : (
        <div className="notes-layout">
          <aside className="notes-sidebar">
            <div className="notes-sidebar-heading">
              <strong>Saved Applications</strong>
              <span>{savedNotes.length}</span>
            </div>

            {savedNotes.length === 0 ? (
              <div className="notes-sidebar-empty">
                No saved notes yet. Click Add Notes to get started.
              </div>
            ) : (
              <div className="notes-list">
                {savedNotes.map((note) => (
                  <button
                    type="button"
                    key={note.id}
                    className={
                      'notes-list-item' +
                      (!editing && selectedId === note.id
                        ? ' notes-list-item-active'
                        : '')
                    }
                    onClick={() => {
                      if (saving) return
                      setSelectedId(note.id)
                      setEditing(false)
                      setError('')
                      setNotice('')
                    }}
                  >
                    <span className="notes-list-company">
                      {note.companyName}
                    </span>

                    <strong>{note.jobTitle}</strong>

                    <span className="notes-list-preview">
                      {note.notes ||
                        note.recruiterName ||
                        'Contact details saved'}
                    </span>

                    {note.followUpDate && (
                      <span className="notes-list-date">
                        Follow-up: {formatDate(note.followUpDate)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </aside>

          <div className="notes-main">
            {editing ? (
              <div>
                <div className="notes-detail-heading">
                  <div>
                    <h3>
                      {savedNotes.some((n) => n.id === editingId)
                        ? 'Edit Application Details'
                        : 'Add Application Notes'}
                    </h3>
                    <p>Save details for the selected application.</p>
                  </div>

                  <button
                    type="button"
                    className="notes-secondary-button"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>

                <form
                  className="notes-editor"
                  onSubmit={(event) => void saveDetails(event)}
                >
                  <label htmlFor="notesApplication">
                    Application
                  </label>

                  <select
                    id="notesApplication"
                    value={editingId}
                    onChange={(event) =>
                      openEditor(event.target.value)
                    }
                    disabled={saving}
                  >
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.jobTitle} — {app.companyName}
                      </option>
                    ))}
                  </select>

                  <div className="notes-editor-grid">
                    <div>
                      <label htmlFor="notesRecruiter">
                        Recruiter Name
                      </label>

                      <input
                        id="notesRecruiter"
                        value={draft.recruiterName}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            recruiterName: event.target.value,
                          }))
                        }
                        placeholder="e.g. Stephan Landsiedel"
                        maxLength={200}
                      />
                    </div>

                    <div>
                      <label htmlFor="notesEmail">
                        Recruiter Email
                      </label>

                      <input
                        id="notesEmail"
                        type="email"
                        value={draft.recruiterEmail}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            recruiterEmail: event.target.value,
                          }))
                        }
                        placeholder="email@example.com"
                        maxLength={320}
                      />
                    </div>
                  </div>

                  <label htmlFor="notesFollowUp">
                    Follow-up Date
                  </label>

                  <input
                    id="notesFollowUp"
                    type="date"
                    value={draft.followUpDate}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        followUpDate: event.target.value,
                      }))
                    }
                  />

                  <label htmlFor="notesText">
                    Application Notes
                  </label>

                  <textarea
                    id="notesText"
                    rows={6}
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Interview details, conversations, next steps..."
                    maxLength={4000}
                  />

                  <button
                    type="submit"
                    className="notes-primary-button notes-save-button"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Details'}
                  </button>
                </form>
              </div>
            ) : selectedNote ? (
              <article className="notes-detail">
                <div className="notes-detail-heading">
                  <div>
                    <span className="notes-eyebrow">
                      {selectedNote.companyName}
                    </span>
                    <h3>{selectedNote.jobTitle}</h3>
                  </div>

                  <button
                    type="button"
                    className="notes-secondary-button"
                    onClick={() => openEditor(selectedNote.id)}
                  >
                    Edit Details
                  </button>
                </div>

                <div className="notes-info-grid">
                  <div className="notes-info-card">
                    <span>Recruiter</span>
                    <strong>
                      {selectedNote.recruiterName || 'Not set'}
                    </strong>
                  </div>

                  <div className="notes-info-card">
                    <span>Email</span>
                    {selectedNote.recruiterEmail ? (
                      <a href={`mailto:${selectedNote.recruiterEmail}`}>
                        {selectedNote.recruiterEmail}
                      </a>
                    ) : (
                      <strong>Not set</strong>
                    )}
                  </div>

                  <div className="notes-info-card">
                    <span>Follow-up</span>
                    <strong>
                      {formatDate(selectedNote.followUpDate)}
                    </strong>
                  </div>
                </div>

                <div className="notes-body">
                  <h4>Application Notes</h4>
                  <p>
                    {selectedNote.notes ||
                      'No written notes for this application yet.'}
                  </p>
                </div>
              </article>
            ) : (
              <div className="notes-empty">
                <h3>Your application notes</h3>
                <p>
                  Select a saved application on the left, or
                  click Add Notes to create your first entry.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
