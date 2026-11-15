
import { useEffect, useState } from 'react'
import './DeadlinesPanel.css'

type JobApplication = {
  id: string
  companyName: string
  jobTitle: string
  status: string
  deadlineDate: string | null
}

type DeadlineApplication = JobApplication & {
  deadlineDate: string
}

function localDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString(
    'en-GB',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  )
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
  const [applications, setApplications] =
    useState<JobApplication[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDeadlines() {
      try {
        const response = await fetch('/api/applications', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Could not load application deadlines.')
        }

        const data: JobApplication[] = await response.json()

        if (active) {
          setApplications(data)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load deadlines.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadDeadlines()

    return () => {
      active = false
    }
  }, [])

  const today = localDateString(new Date())

  const weekEndDate = new Date()
  weekEndDate.setDate(weekEndDate.getDate() + 7)

  const weekEnd = localDateString(weekEndDate)

  const drafts = applications.filter(
    (app): app is DeadlineApplication =>
      app.status === 'Draft' &&
      typeof app.deadlineDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(app.deadlineDate)
  )

  const overdue = drafts
    .filter((app) => app.deadlineDate < today)
    .sort((a, b) =>
      a.deadlineDate.localeCompare(b.deadlineDate)
    )

  const upcoming = drafts
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
          <p>{app.companyName}</p>
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
            Stay ahead of your upcoming application deadlines.
          </p>
        </div>

        <span className="deadlines-heading-icon">◷</span>
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
                No outstanding application deadlines
                within the next 7 days.
              </p>
            </div>
          )}
        </>
      )}

      <p className="deadlines-footnote">
        Tracks submission deadlines for Draft applications.
        Dates are based on your local calendar.
      </p>
    </section>
  )
}
