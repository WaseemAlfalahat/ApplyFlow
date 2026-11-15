
import { useEffect, useState, type FormEvent } from 'react'
import CompaniesPanel from './components/CompaniesPanel'
import ApplicationsPanel from './components/ApplicationsPanel'
import './App.css'

type Mode = 'login' | 'register'

type Profile = {
  email: string
}

type Dashboard = {
  totalCompanies: number
  totalApplications: number
  rejectedApplications: number
}

async function getError(response: Response): Promise<string> {
  try {
    const data = await response.json()

    if (data.errors) {
      const messages = Object.values(data.errors).flat()
      return messages.join(' ')
    }

    return data.detail || data.title || 'Request failed.'
  } catch {
    return `Request failed (${response.status}).`
  }
}

function App() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)

  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Load account information and dashboard statistics
  async function loadAccount(): Promise<void> {
    const accountResponse = await fetch('/api/auth/manage/info', {
      credentials: 'include',
    })

    if (!accountResponse.ok) {
      throw new Error('Unable to load account information.')
    }

    const account: Profile = await accountResponse.json()

    const dashboardResponse = await fetch('/api/dashboard/summary', {
      credentials: 'include',
    })

    if (!dashboardResponse.ok) {
      throw new Error('Unable to load your dashboard.')
    }

    const stats: Dashboard = await dashboardResponse.json()

    setProfile(account)
    setDashboard(stats)
  }

  // Restore an existing session when the website loads
  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const response = await fetch('/api/auth/manage/info', {
          credentials: 'include',
        })

        if (response.ok) {
          const account: Profile = await response.json()

          const summary = await fetch('/api/dashboard/summary', {
            credentials: 'include',
          })

          if (summary.ok) {
            const stats: Dashboard = await summary.json()

            if (active) {
              setProfile(account)
              setDashboard(stats)
            }
          }
        }
      } catch {
        // No active session or backend temporarily unavailable
      } finally {
        if (active) {
          setChecking(false)
        }
      }
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [])

  // Handle registration and login
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (mode === 'register' && password.length < 8) {
      setError('Your password must contain at least 8 characters.')
      return
    }

    setBusy(true)

    try {
      if (mode === 'register') {
        const registration = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        })

        if (!registration.ok) {
          throw new Error(await getError(registration))
        }
      }

      const login = await fetch('/api/auth/login?useCookies=true', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      if (!login.ok) {
        throw new Error(await getError(login))
      }

      await loadAccount()

      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong.'
      )
    } finally {
      setBusy(false)
    }
  }

  // Handle logout
  async function handleLogout() {
    setBusy(true)

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Logout failed.')
      }

      setProfile(null)
      setDashboard(null)
      setPassword('')
      setConfirmPassword('')
      setError('')
      setMode('login')
    } catch {
      window.alert('Could not sign out. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Switch between login and registration
  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  // Loading screen
  if (checking) {
    return (
      <div className="loading-screen">
        <div className="brand-mark">A</div>
        <p>Loading ApplyFlow...</p>
      </div>
    )
  }

  // Authenticated dashboard
  if (profile) {
    return (
      <div className="dashboard-page">

        {/* Dashboard Header */}
        <header className="dashboard-header">
          <div className="brand">
            <span className="brand-mark">A</span>
            <span>ApplyFlow</span>
          </div>

          <div className="dashboard-actions">
            <span className="account-email">
              {profile.email}
            </span>

            <button
              type="button"
              className="logout-button"
              onClick={() => void handleLogout()}
              disabled={busy}
            >
              {busy ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="dashboard-main">

          <div className="eyebrow">
            YOUR WORKSPACE
          </div>

          <h1>Welcome to ApplyFlow.</h1>

          <p className="muted">
            Your job search, organized in one place.
          </p>

          {/* Dashboard Statistics */}
          <div className="stats-grid">

            {/* Total Applications */}
            <article className="stat-card">
              <span>Total Applications</span>

              <strong>
                {dashboard?.totalApplications ?? '—'}
              </strong>

              <small>
                Applications in your tracker
              </small>
            </article>

            {/* Saved Companies */}
            <article className="stat-card">
              <span>Saved Companies</span>

              <strong>
                {dashboard?.totalCompanies ?? '—'}
              </strong>

              <small>
                Companies you're tracking
              </small>
            </article>

            {/* Rejections Counter */}
            <article className="stat-card">
              <span>Rejections</span>

              <strong>
                {dashboard?.rejectedApplications ?? '—'}
              </strong>

              <small>
                Applications marked as rejected
              </small>
            </article>

          </div>

          {/* Job Applications Tracker */}
          <ApplicationsPanel onChanged={loadAccount} />

          {/* Companies Management */}
          <CompaniesPanel onChanged={loadAccount} />

          {/* Backend Connection Information */}
          <div className="next-card">
            <h2>Your workspace is connected.</h2>

            <p>
              Authentication and dashboard data are coming
              directly from your ASP.NET Core API and Azure SQL.
            </p>

            <span className="connected">
              <span className="status-dot" />
              Backend connected
            </span>
          </div>

        </main>
      </div>
    )
  }

  // Login and Registration Page
  return (
    <div className="auth-page">

      {/* Left-side introduction */}
      <section className="showcase">
        <div className="brand">
          <span className="brand-mark">A</span>
          <span>ApplyFlow</span>
        </div>

        <div className="showcase-content">
          <div className="eyebrow">
            YOUR CAREER, ORGANIZED.
          </div>

          <h1>
            Every application.
            <br />
            <span>One clear path.</span>
          </h1>

          <p>
            Track opportunities, manage companies, and stay
            on top of every step in your job search.
          </p>

          <div className="feature-line">
            <span className="feature-icon">✓</span>
            Track your job applications
          </div>

          <div className="feature-line">
            <span className="feature-icon">✓</span>
            Organize your opportunities
          </div>

          <div className="feature-line">
            <span className="feature-icon">✓</span>
            Keep your information private
          </div>
        </div>

        <div className="showcase-footer">
          Built for a smarter job search.
        </div>
      </section>

      {/* Login and Registration Form */}
      <main className="auth-main">
        <div className="auth-container">

          <div className="mobile-brand">
            <span className="brand-mark">A</span>
            <strong>ApplyFlow</strong>
          </div>

          <div className="eyebrow">
            WELCOME TO APPLYFLOW
          </div>

          <h2>
            {mode === 'login'
              ? 'Welcome back'
              : 'Create your account'}
          </h2>

          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Enter your credentials to access your workspace.'
              : 'Start organizing your applications today.'}
          </p>

          {/* Login / Registration Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              Sign in
            </button>

            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => switchMode('register')}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit}>

            <label htmlFor="email">
              Email address
            </label>

            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete={
                mode === 'login'
                  ? 'current-password'
                  : 'new-password'
              }
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              minLength={mode === 'register' ? 8 : undefined}
            />

            {mode === 'register' && (
              <>
                <label htmlFor="confirmPassword">
                  Confirm password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  required
                />

                <p className="password-hint">
                  At least 8 characters, including uppercase,
                  lowercase, number and symbol.
                </p>
              </>
            )}

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="submit-button"
              type="submit"
              disabled={busy}
            >
              {busy
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in to ApplyFlow'
                  : 'Create account'}

              {!busy && <span>→</span>}
            </button>

          </form>

          <p className="switch-text">
            {mode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}{' '}

            <button
              type="button"
              onClick={() =>
                switchMode(
                  mode === 'login' ? 'register' : 'login'
                )
              }
            >
              {mode === 'login'
                ? 'Create one'
                : 'Sign in'}
            </button>
          </p>

          <p className="auth-footer">
            ApplyFlow · Your applications, your space.
          </p>

        </div>
      </main>

    </div>
  )
}

export default App
