
import { useEffect, useState, type FormEvent } from 'react'

const STATUSES = [
  'Draft',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
] as const

type Status = (typeof STATUSES)[number]

type Company = {
  id: string
  name: string
}

type JobApplication = {
  id: string
  companyId: string
  companyName: string
  jobTitle: string
  jobUrl: string | null
  status: string
  appliedOn: string | null
  deadlineDate: string | null
  createdAtUtc: string
}

type Props = {
  onChanged: () => Promise<void>
}

export default function ApplicationsPanel({ onChanged }: Props) {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const [companyId, setCompanyId] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [status, setStatus] = useState<Status>('Draft')
  const [appliedOn, setAppliedOn] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const busy = saving || deletingId !== null || loadingCompanies

  useEffect(() => {
    let active = true

    async function loadApplications() {
      try {
        const response = await fetch('/api/applications', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Could not load applications.')
        }

        const data: JobApplication[] = await response.json()

        if (active) setApplications(data)
      } catch {
        if (active) {
          setError('Unable to load your job applications.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadApplications()

    return () => {
      active = false
    }
  }, [])

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setCompanyId('')
    setJobTitle('')
    setJobUrl('')
    setStatus('Draft')
    setAppliedOn('')
    setDeadlineDate('')
  }

  async function openForm(application?: JobApplication) {
    if (busy) return

    setError('')
    setNotice('')
    setLoadingCompanies(true)

    try {
      const response = await fetch('/api/companies', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Could not load your companies.')
      }

      const data: Company[] = await response.json()
      setCompanies(data)

      if (data.length === 0) {
        setError('Add a company before creating an application.')
        return
      }

      setEditingId(application?.id ?? null)
      setCompanyId(application?.companyId ?? data[0].id)
      setJobTitle(application?.jobTitle ?? '')
      setJobUrl(application?.jobUrl ?? '')
      setStatus(
        application &&
          STATUSES.includes(application.status as Status)
          ? (application.status as Status)
          : 'Draft'
      )
      setAppliedOn(application?.appliedOn ?? '')
      setDeadlineDate(application?.deadlineDate ?? '')

      setShowForm(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
      )
    } finally {
      setLoadingCompanies(false)
    }
  }

  async function refreshDashboard() {
    try {
      await onChanged()
    } catch {
      setNotice(
        'Changes saved, but dashboard statistics need a refresh.'
      )
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!jobTitle.trim()) {
      setError('Job title is required.')
      return
    }

    const currentEditingId = editingId
    const isEditing = currentEditingId !== null

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch(
        isEditing
          ? `/api/applications/${currentEditingId}`
          : '/api/applications',
        {
          method: isEditing ? 'PUT' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId,
            jobTitle: jobTitle.trim(),
            jobUrl: jobUrl.trim() || null,
            status,
            appliedOn: appliedOn || null,
            deadlineDate: deadlineDate || null,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          `Could not save application (${response.status}).`
        )
      }

      const saved: JobApplication = await response.json()

      setApplications((current) =>
        isEditing
          ? current.map((application) =>
              application.id === saved.id ? saved : application
            )
          : [saved, ...current]
      )

      setSearch('')
      setFilter('All')
      resetForm()

      setNotice(
        isEditing
          ? 'Application updated successfully!'
          : 'Job application added successfully!'
      )

      await refreshDashboard()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(application: JobApplication) {
    const confirmed = window.confirm(
      `Delete "${application.jobTitle}" from ApplyFlow?`
    )

    if (!confirmed) return

    setDeletingId(application.id)
    setError('')
    setNotice('')

    try {
      const response = await fetch(
        `/api/applications/${application.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error(
          `Could not delete application (${response.status}).`
        )
      }

      setApplications((current) =>
        current.filter((item) => item.id !== application.id)
      )

      if (editingId === application.id) resetForm()

      setNotice('Application deleted successfully!')
      await refreshDashboard()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = applications.filter((application) => {
    const query = search.trim().toLowerCase()

    const matchesSearch =
      application.jobTitle.toLowerCase().includes(query) ||
      application.companyName.toLowerCase().includes(query)

    const matchesStatus =
      filter === 'All' || application.status === filter

    return matchesSearch && matchesStatus
  })

  return (
    <section className="applications-panel">
      <div className="applications-heading">
        <div>
          <h2>Job Applications</h2>
          <p>Track every opportunity in one place.</p>
        </div>

        <button
          type="button"
          className="add-company-button"
          disabled={busy}
          onClick={() => {
            if (showForm) {
              resetForm()
            } else {
              void openForm()
            }
          }}
        >
          {loadingCompanies
            ? 'Loading...'
            : showForm
              ? 'Cancel'
              : '+ Add Application'}
        </button>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <p className="company-notice" role="status">
          {notice}
        </p>
      )}

      {showForm && (
        <form className="application-form" onSubmit={handleSubmit}>
          <h3>
            {editingId ? 'Edit Application' : 'Add Application'}
          </h3>

          <label htmlFor="applicationCompany">Company</label>
          <select
            id="applicationCompany"
            value={companyId}
            onChange={(event) => setCompanyId(event.target.value)}
            required
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <label htmlFor="applicationTitle">Job Title</label>
          <input
            id="applicationTitle"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="e.g. Software Development Intern"
            maxLength={200}
            required
          />

          <label htmlFor="applicationUrl">
            Job Posting URL (optional)
          </label>
          <input
            id="applicationUrl"
            type="url"
            value={jobUrl}
            onChange={(event) => setJobUrl(event.target.value)}
            placeholder="https://example.com/jobs/123"
            maxLength={2048}
          />

          <label htmlFor="applicationStatus">Status</label>
          <select
            id="applicationStatus"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as Status)
            }
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <div className="application-date-grid">
            <div>
              <label htmlFor="appliedOn">
                Applied On (optional)
              </label>
              <input
                id="appliedOn"
                type="date"
                value={appliedOn}
                onChange={(event) =>
                  setAppliedOn(event.target.value)
                }
              />
            </div>

            <div>
              <label htmlFor="deadlineDate">
                Deadline (optional)
              </label>
              <input
                id="deadlineDate"
                type="date"
                value={deadlineDate}
                onChange={(event) =>
                  setDeadlineDate(event.target.value)
                }
              />
            </div>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={busy}
          >
            {saving
              ? 'Saving...'
              : editingId
                ? 'Save Changes'
                : 'Save Application'}
          </button>
        </form>
      )}

      <div className="application-toolbar">
        <input
          type="search"
          aria-label="Search job applications"
          placeholder="Search by job title or company..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          aria-label="Filter by application status"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="All">All Statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <p className="application-result-count">
        {filtered.length} application
        {filtered.length === 1 ? '' : 's'} shown
      </p>

      {loading ? (
        <div className="application-empty">
          Loading applications...
        </div>
      ) : applications.length === 0 ? (
        <div className="application-empty">
          <h3>No applications yet</h3>
          <p>Add your first job application.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="application-empty">
          No applications match your search.
        </div>
      ) : (
        <div className="application-list">
          {filtered.map((application) => {
            const safeUrl =
              application.jobUrl &&
              /^https?:\/\//i.test(application.jobUrl)
                ? application.jobUrl
                : null

            return (
              <article
                className="application-item"
                key={application.id}
              >
                <div className="application-card-top">
                  <div>
                    <h3>{application.jobTitle}</h3>
                    <p>{application.companyName}</p>
                  </div>

                  <div className="application-card-actions">
                    <span
                      className={
                        'application-status status-' +
                        application.status.toLowerCase()
                      }
                    >
                      {application.status}
                    </span>

                    <button
                      type="button"
                      className="app-action-button"
                      disabled={busy}
                      onClick={() => void openForm(application)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="app-action-button app-action-button--danger"
                      disabled={busy}
                      onClick={() => void handleDelete(application)}
                    >
                      {deletingId === application.id
                        ? 'Deleting...'
                        : 'Delete'}
                    </button>
                  </div>
                </div>

                <div className="application-meta">
                  <span>
                    Applied: {application.appliedOn || 'Not set'}
                  </span>
                  <span>
                    Deadline: {application.deadlineDate || 'Not set'}
                  </span>
                </div>

                {safeUrl && (
                  <a
                    className="application-link"
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View job posting ↗
                  </a>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
