
import { useEffect, useState } from 'react'
import './DeadlinesPanel.css'

type JobApplication = {
  id: string
  companyName: string
  jobTitle: string
  status: string
  deadlineDate: string | null
}

type DeadlineApplication = Omit<JobApplication, 'deadlineDate'> & {
  deadlineDate: string
}

function localDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function daysBetween(today: string, deadline: string): number {
  function toUTC(value: string): number {
    const [year, month, day] = value.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }

  return Math.round(
    (toUTC(deadline) - toUTC(today)) / 86400000
  )
}

export default function DeadlinesPanel() {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadDeadlines() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/applications', {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Could not load application deadlines.')
        }

        const data: JobApplication[] = await response.json()

        if (!controller.signal.aborted) {
          setApplications(data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load deadlines.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadDeadlines()

    return () => controller.abort()
  }, [refreshCount])

  useEffect(() => {
    function refreshOnFocus() {
      setRefreshCount((current) => current + 1)
    }

    window.addEventListener('focus', refreshOnFocus)

    return () => {
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [])

  const today = localDateString(new Date())

  const weekEndDate = new Date()
  weekEndDate.setDate(weekEndDate.getDate() + 7)

  const weekEnd = localDateString(weekEndDate)

  // Include all active application stages, not only Draft.
  // Rejected and Withdrawn are considered closed.
  const relevant: DeadlineApplication[] = applications.flatMap((app) => {
    const date =
      typeof app.deadlineDate === 'string'
        ? app.deadlineDate.slice(0, 10)
        : ''

    if (
      app.status === 'Rejected' ||
      app.status === 'Withdrawn' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return []
    }

    return [{ ...app, deadlineDate: date }]
  })

  const overdue = relevant
    .filter((app) => app.deadlineDate < today)
    .sort((a, b) =>
      a.deadlineDate.localeCompare(b.deadlineDate)
    )

  const upcoming = relevant
    .filter(
      (app) =>
        app.deadlineDate >= today &&
        app.deadlineDate <= weekEnd
    )
    .sort((a, b) =>
      a.deadlineDate.localeCompare(b.deadlineDate)
    )

  function renderDeadline(
    app: DeadlineApplication,
    isOverdue: boolean
  ) {
    const days = daysBetween(today, app.deadlineDate)

    const label = isOverdue
      ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
      : days === 0
        ? 'Due today'
        : days === 1
          ? 'Due tomorrow'
          : `${days} days left`

    return (
      <article className="deadline-item" key={app.id}>
        <div className="deadline-item-info">
          <h3>{app.jobTitle}</h3>
          <p>
            {app.companyName} · {app.status}
          </p>
          <span>{formatDate(app.deadlineDate)}</span>
        </div>

        <span
          className={
            isOverdue
              ? 'deadline-label deadline-label-danger'
              : 'deadline-label deadline-label-soon'
          }
        >
          {label}
        </span>
      </article>
    )
  }

  return (
    <section className="deadlines-panel">
      <div className="deadlines-heading">
        <div>
          <h2>Deadlines & Reminders</h2>
          <p>
            Keep track of important dates across your applications.
          </p>
        </div>

        <button
          type="button"
          className="app-action-button"
          onClick={() =>
            setRefreshCount((current) => current + 1)
          }
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="deadlines-empty">
          Loading your deadlines...
        </div>
      ) : error ? (
        <div className="form-error" role="alert">
          {error}
        </div>
      ) : (
        <>
          <div className="deadline-summary">
            <div className="deadline-summary-card">
              <span>Due in 7 Days</span>
              <strong>{upcoming.length}</strong>
            </div>

            <div className="deadline-summary-card">
              <span>Overdue</span>
              <strong>{overdue.length}</strong>
            </div>
          </div>

          {overdue.length > 0 && (
            <div className="deadline-group">
              <h3>Overdue Deadlines</h3>

              <div className="deadline-list">
                {overdue.map((app) =>
                  renderDeadline(app, true)
                )}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="deadline-group">
              <h3>Upcoming Deadlines</h3>

              <div className="deadline-list">
                {upcoming.map((app) =>
                  renderDeadline(app, false)
                )}
              </div>
            </div>
          )}

          {overdue.length === 0 && upcoming.length === 0 && (
            <div className="deadlines-empty">
              <div className="deadlines-empty-icon">✓</div>
              <h3>You're all caught up!</h3>
              <p>
                No upcoming deadlines within the next 7 days
                and no overdue dates on active applications.
              </p>
            </div>
          )}
        </>
      )}

      <p className="deadlines-footnote">
        Tracks saved dates for active applications.
        Rejected and withdrawn applications are excluded.
        These are in-app reminders, not email notifications.
      </p>
    </section>
  )
}
