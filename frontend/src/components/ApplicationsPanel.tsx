
import { useEffect, useState, type FormEvent } from 'react'
import {
  csvCell,
  filterAndSortApplications,
  type SortMode,
} from '../utils/applicationUtils'

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

const NEW_COMPANY = '__new_company__'

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
  const [sortBy, setSortBy] = useState<SortMode>('newest')

  const [companyChoice, setCompanyChoice] = useState(NEW_COMPANY)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [status, setStatus] = useState<Status>('Draft')
  const [appliedOn, setAppliedOn] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const busy = saving || deletingId !== null || loadingCompanies

  useEffect(() => {
    const controller = new AbortController()

    async function loadApplications() {
      try {
        const response = await fetch('/api/applications', {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Could not load applications.')
        }

        const data: JobApplication[] = await response.json()

        if (!controller.signal.aborted) {
          setApplications(data)
        }
      } catch {
        if (!controller.signal.aborted) {
          setError('Unable to load your job applications.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadApplications()

    return () => controller.abort()
  }, [])

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setCompanyChoice(NEW_COMPANY)
    setNewCompanyName('')
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
        throw new Error('Could not load companies.')
      }

      const data: Company[] = await response.json()

      setCompanies(data)
      setEditingId(application?.id ?? null)
      setCompanyChoice(application?.companyId ?? NEW_COMPANY)
      setNewCompanyName('')
      setJobTitle(application?.jobTitle ?? '')
      setJobUrl(application?.jobUrl ?? '')
      setStatus(
        application && STATUSES.includes(application.status as Status)
          ? (application.status as Status)
          : 'Draft'
      )
      setAppliedOn(application?.appliedOn?.slice(0, 10) ?? '')
      setDeadlineDate(application?.deadlineDate?.slice(0, 10) ?? '')
      setShowForm(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not open the form.'
      )
    } finally {
      setLoadingCompanies(false)
    }
  }

  async function refreshDashboard() {
    try {
      await onChanged()
    } catch {
      setNotice('Saved successfully. Refresh the page to update all widgets.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!jobTitle.trim()) {
      setError('Job title is required.')
      return
    }

    if (companyChoice === NEW_COMPANY && !newCompanyName.trim()) {
      setError('Enter the company name.')
      return
    }

    const isEditing = editingId !== null

    setSaving(true)
    setError('')
    setNotice('')

    try {
      let resolvedCompanyId = companyChoice

      if (companyChoice === NEW_COMPANY) {
        const cleanName = newCompanyName.trim()

        const existingCompany = companies.find(
          (company) =>
            company.name.toLocaleLowerCase() ===
            cleanName.toLocaleLowerCase()
        )

        if (existingCompany) {
          resolvedCompanyId = existingCompany.id
        } else {
          const companyResponse = await fetch('/api/companies', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: cleanName,
              website: null,
              location: null,
            }),
          })

          if (!companyResponse.ok) {
            throw new Error(
              `Could not create company (${companyResponse.status}).`
            )
          }

          const createdCompany: Company = await companyResponse.json()

          resolvedCompanyId = createdCompany.id

          setCompanies((current) =>
            [...current, createdCompany].sort((a, b) =>
              a.name.localeCompare(b.name)
            )
          )
        }

        // If saving the application fails, retry with the saved company.
        setCompanyChoice(resolvedCompanyId)
      }

      const response = await fetch(
        isEditing
          ? `/api/applications/${editingId}`
          : '/api/applications',
        {
          method: isEditing ? 'PUT' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId: resolvedCompanyId,
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

      resetForm()

      setNotice(
        isEditing
          ? 'Application updated successfully!'
          : 'Job application added successfully!'
      )

      await refreshDashboard()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save application.'
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
        err instanceof Error ? err.message : 'Could not delete application.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const visibleApplications = filterAndSortApplications(
    applications,
    search,
    filter,
    sortBy
  )

  function exportCsv() {
    if (visibleApplications.length === 0) return

    const headers = [
      'Company',
      'Job Title',
      'Status',
      'Applied On',
      'Deadline',
      'Job URL',
    ]

    const rows = visibleApplications.map((app) => [
      app.companyName,
      app.jobTitle,
      app.status,
      app.appliedOn,
      app.deadlineDate,
      app.jobUrl,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')

    const blob = new Blob(
      ['\uFEFF', csv],
      { type: 'text/csv;charset=utf-8;' }
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download =
      `applyflow-applications-${new Date().toISOString().slice(0, 10)}.csv`

    document.body.appendChild(link)
    link.click()
    link.remove()

    window.setTimeout(() => URL.revokeObjectURL(url), 1000)

    setNotice(
      `Exported ${visibleApplications.length} application(s) to CSV.`
    )
  }

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
        <form
          className="application-form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <h3>{editingId ? 'Edit Application' : 'Add Application'}</h3>

          <label htmlFor="applicationCompany">
            Company
          </label>

          <select
            id="applicationCompany"
            value={companyChoice}
            onChange={(event) =>
              setCompanyChoice(event.target.value)
            }
            disabled={saving}
            required
          >
            <option value={NEW_COMPANY}>
              + Add a new company
            </option>

            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          {companyChoice === NEW_COMPANY && (
            <>
              <label htmlFor="newApplicationCompany">
                New Company Name
              </label>

              <input
                id="newApplicationCompany"
                value={newCompanyName}
                onChange={(event) =>
                  setNewCompanyName(event.target.value)
                }
                placeholder="e.g. BMW Group"
                maxLength={200}
                disabled={saving}
                required
              />

              <p
                style={{
                  color: '#aaa',
                  fontSize: 12,
                  margin: '-6px 0 22px',
                }}
              >
                The company will be saved automatically with this
                application. No separate step needed.
              </p>
            </>
          )}

          <label htmlFor="applicationTitle">
            Job Title
          </label>

          <input
            id="applicationTitle"
            value={jobTitle}
            onChange={(event) =>
              setJobTitle(event.target.value)
            }
            placeholder="e.g. Software Development Intern"
            maxLength={200}
            disabled={saving}
            required
          />

          <label htmlFor="applicationUrl">
            Job Posting URL (optional)
          </label>

          <input
            id="applicationUrl"
            type="url"
            value={jobUrl}
            onChange={(event) =>
              setJobUrl(event.target.value)
            }
            placeholder="https://example.com/jobs/123"
            maxLength={2048}
            disabled={saving}
          />

          <label htmlFor="applicationStatus">
            Status
          </label>

          <select
            id="applicationStatus"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as Status)
            }
            disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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

        <select
          aria-label="Sort applications"
          value={sortBy}
          onChange={(event) =>
            setSortBy(event.target.value as SortMode)
          }
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="deadline">Deadline Soonest</option>
          <option value="company">Company A–Z</option>
        </select>

        <button
          type="button"
          className="export-csv-button"
          onClick={exportCsv}
          disabled={
            loading || visibleApplications.length === 0
          }
        >
          Export CSV
        </button>
      </div>

      <p className="application-result-count">
        {visibleApplications.length} application
        {visibleApplications.length === 1 ? '' : 's'} shown
      </p>

      {loading ? (
        <div className="application-empty">
          Loading applications...
        </div>
      ) : applications.length === 0 ? (
        <div className="application-empty">
          <h3>No applications yet</h3>
          <p>Add your first application.</p>
        </div>
      ) : visibleApplications.length === 0 ? (
        <div className="application-empty">
          No applications match your search.
        </div>
      ) : (
        <div className="application-list">
          {visibleApplications.map((application) => {
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
                      onClick={() =>
                        void openForm(application)
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="app-action-button app-action-button--danger"
                      disabled={busy}
                      onClick={() =>
                        void handleDelete(application)
                      }
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
