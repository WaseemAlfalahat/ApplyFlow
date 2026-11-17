
type DashboardSummary = {
  totalApplications: number
  totalCompanies: number
  rejectedApplications: number
}

type Props = {
  summary: DashboardSummary | null
}

export default function DashboardSpotlight({ summary }: Props) {
  const date = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <div className="af-overview" id="overview">
      <section className="af-hero">
        <div className="af-hero-main">
          <div className="af-hero-label">
            <span className="af-live-dot" />
            YOUR CAREER COMMAND CENTER
          </div>

          <p className="af-hero-date">{date}</p>

          <h1>
            Your next opportunity
            <span> starts here.</span>
          </h1>

          <p className="af-hero-description">
            Every application, every conversation, every next
            step. One beautifully organized workspace.
          </p>

          <div className="af-hero-buttons">
            <a className="af-button-primary" href="#applications">
              Manage applications <span aria-hidden="true">↗</span>
            </a>

            <a className="af-button-secondary" href="#notes">
              View your notes
            </a>
          </div>
        </div>

        <aside className="af-focus-card" aria-label="Quick navigation">
          <div className="af-focus-header">
            <span>YOUR NEXT MOVES</span>
            <span className="af-focus-sparkle" aria-hidden="true">✦</span>
          </div>

          <p>Stay one step ahead.</p>

          <a href="#deadlines">
            <span className="af-focus-number">01</span>
            <span>Review upcoming deadlines</span>
            <span aria-hidden="true">↗</span>
          </a>

          <a href="#applications">
            <span className="af-focus-number">02</span>
            <span>Update application statuses</span>
            <span aria-hidden="true">↗</span>
          </a>

          <a href="#notes">
            <span className="af-focus-number">03</span>
            <span>Check recruiter conversations</span>
            <span aria-hidden="true">↗</span>
          </a>
        </aside>
      </section>

      <div className="af-overview-title">
        <div>
          <span className="af-section-eyebrow">AT A GLANCE</span>
          <h2>Your application overview</h2>
        </div>
        <span className="af-overview-note">
          Updated from your workspace
        </span>
      </div>

      <div className="af-stats-grid">
        <article className="af-stat-card af-stat-purple">
          <div className="af-stat-top">
            <span>Applications tracked</span>
            <span className="af-stat-icon" aria-hidden="true">↗</span>
          </div>

          <strong>{summary?.totalApplications ?? '—'}</strong>
          <small>All opportunities in your tracker</small>
          <div className="af-stat-line" />
        </article>

        <article className="af-stat-card af-stat-mint">
          <div className="af-stat-top">
            <span>Companies saved</span>
            <span className="af-stat-icon" aria-hidden="true">▦</span>
          </div>

          <strong>{summary?.totalCompanies ?? '—'}</strong>
          <small>Organizations you're following</small>
          <div className="af-stat-line" />
        </article>

        <article className="af-stat-card af-stat-rose">
          <div className="af-stat-top">
            <span>Rejected applications</span>
            <span className="af-stat-icon" aria-hidden="true">◷</span>
          </div>

          <strong>{summary?.rejectedApplications ?? '—'}</strong>
          <small>Applications marked as rejected</small>
          <div className="af-stat-line" />
        </article>
      </div>
    </div>
  )
}
