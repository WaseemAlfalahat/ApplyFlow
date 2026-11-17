
import { useEffect, useState, type FormEvent } from 'react'

import ApplicationsPanel from './components/ApplicationsPanel'
import ApplicationDetailsPanel from './components/ApplicationDetailsPanel'
import DeadlinesPanel from './components/DeadlinesPanel'
import ApplicationAnalytics from './components/ApplicationAnalytics'
import DashboardSpotlight from './components/DashboardSpotlight'

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
  const [refreshVersion, setRefreshVersion] = useState(0)

  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
      throw new Error('Unable to load dashboard information.')
    }

    const stats: Dashboard = await dashboardResponse.json()

    setProfile(account)
    setDashboard(stats)
  }

  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const response = await fetch('/api/auth/manage/info', {
          credentials: 'include',
        })

        if (response.ok) {
          const account: Profile = await response.json()

          const summaryResponse = await fetch(
            '/api/dashboard/summary',
            { credentials: 'include' }
          )

          if (summaryResponse.ok) {
            const stats: Dashboard = await summaryResponse.json()

            if (active) {
              setProfile(account)
              setDashboard(stats)
            }
          }
        }
      } catch {
        // No existing session or backend unavailable
      } finally {
        if (active) setChecking(false)
      }
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [])

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
        const registrationResponse = await fetch(
          '/api/auth/register',
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          }
        )

        if (!registrationResponse.ok) {
          throw new Error(await getError(registrationResponse))
        }
      }

      const loginResponse = await fetch(
        '/api/auth/login?useCookies=true',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        }
      )

      if (!loginResponse.ok) {
        throw new Error(await getError(loginResponse))
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
      setEmail('')
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

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleApplicationsChanged() {
    // Refresh the widgets immediately, even if stats fail to reload.
    setRefreshVersion((current) => current + 1)
    await loadAccount()
  }


  if (checking) {
    return (
      <div className="loading-screen">
        <div className="brand-mark">A</div>
        <p>Loading ApplyFlow...</p>
      </div>
    )
  }

  if (profile) {
    return (
      <div className="dashboard-page">
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

        <main className="dashboard-main">
          <DashboardSpotlight summary={dashboard} />

          <div id="deadlines">
            <DeadlinesPanel
              key={`deadlines-${refreshVersion}`}
            />
          </div>

          <ApplicationAnalytics
            key={`analytics-${refreshVersion}`}
          />

          <div id="applications">
            <ApplicationsPanel
              onChanged={handleApplicationsChanged}
            />
          </div>

          <div id="notes">
            <ApplicationDetailsPanel
              key={`notes-${refreshVersion}`}
            />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="auth-page">
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
                  placeholder="Confirm password"
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

              {!busy && (
                <span aria-hidden="true">→</span>
              )}
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
