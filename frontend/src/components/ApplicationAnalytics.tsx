
import { useEffect, useState } from 'react'

const STATUSES = [
  'Draft',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
] as const

type JobApplication = {
  id: string
  status: string
}

export default function ApplicationAnalytics() {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadAnalytics() {
      try {
        const response = await fetch('/api/applications', {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Unable to load application analytics.')
        }

        const data: JobApplication[] = await response.json()

        if (!controller.signal.aborted) {
          setApplications(data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : 'Something went wrong.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadAnalytics()

    return () => controller.abort()
  }, [])

  const total = applications.length

  const countStatus = (status: string) =>
    applications.filter((app) => app.status === status).length

  const interviews = countStatus('Interview')
  const offers = countStatus('Offer')

  const percentage = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <section className="analytics-panel" aria-labelledby="analytics-title">
      <div className="analytics-heading">
        <div>
          <h2 id="analytics-title">Application Analytics</h2>
          <p>Understand where your applications stand.</p>
        </div>
        <span className="analytics-total">
          {total} total applications
        </span>
      </div>

      {loading ? (
        <p className="analytics-message">Loading analytics...</p>
      ) : error ? (
        <div className="form-error" role="alert">{error}</div>
      ) : (
        <>
          <div className="analytics-highlights">
            <article className="analytics-highlight">
              <span>Interviews</span>
              <strong>{interviews}</strong>
              <small>{percentage(interviews)}% currently in interview stage</small>
            </article>

            <article className="analytics-highlight">
              <span>Offers</span>
              <strong>{offers}</strong>
              <small>{percentage(offers)}% currently in offer stage</small>
            </article>
          </div>

          <div className="analytics-distribution">
            <h3>Application Status Breakdown</h3>
            <p>How your tracked applications are distributed.</p>

            {total === 0 ? (
              <div className="analytics-message">
                Add your first application to see your analytics.
              </div>
            ) : (
              <div className="analytics-bars">
                {STATUSES.map((status) => {
                  const count = countStatus(status)

                  return (
                    <div className="analytics-bar-item" key={status}>
                      <div className="analytics-bar-label">
                        <span>{status}</span>
                        <span>
                          {count} ({percentage(count)}%)
                        </span>
                      </div>

                      <progress
                        className={
                          `analytics-progress analytics-progress--${status.toLowerCase()}`
                        }
                        max={total}
                        value={count}
                        aria-label={`${status} applications`}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <p className="analytics-footnote">
            Based on each application's current status.
            These are not historical interview or offer conversion rates.
          </p>
        </>
      )}
    </section>
  )
}
