
import { useEffect, useState, type FormEvent } from 'react'

type Company = {
  id: string
  name: string
  website: string | null
  location: string | null
}

type Props = {
  onChanged: () => Promise<void>
}

export default function CompaniesPanel({ onChanged }: Props) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    async function loadCompanies() {
      try {
        const response = await fetch('/api/companies', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Could not load companies.')
        }

        const data: Company[] = await response.json()

        if (active) {
          setCompanies(data)
        }
      } catch {
        if (active) {
          setError('Unable to load companies.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadCompanies()

    return () => {
      active = false
    }
  }, [])

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setName('')
    setWebsite('')
    setLocation('')
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
    setError('')
    setNotice('')
  }

  function openEdit(company: Company) {
    setEditingId(company.id)
    setName(company.name)
    setWebsite(company.website ?? '')
    setLocation(company.location ?? '')
    setShowForm(true)
    setError('')
    setNotice('')
  }

  async function refreshDashboard() {
    try {
      await onChanged()
    } catch {
      setNotice(
        'Changes saved. Dashboard statistics may need a refresh.'
      )
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim()) {
      setError('Company name is required.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    const isEditing = editingId !== null

    try {
      const response = await fetch(
        isEditing
          ? `/api/companies/${editingId}`
          : '/api/companies',
        {
          method: isEditing ? 'PUT' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            website: website.trim() || null,
            location: location.trim() || null,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          `Could not save company (${response.status}).`
        )
      }

      const company: Company = await response.json()

      setCompanies((current) => {
        const updated = isEditing
          ? current.map((c) =>
              c.id === company.id ? company : c
            )
          : [...current, company]

        return updated.sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      })

      resetForm()

      setNotice(
        isEditing
          ? 'Company updated successfully!'
          : 'Company added successfully!'
      )

      await refreshDashboard()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(company: Company) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${company.name}"?`
    )

    if (!confirmed) return

    setDeletingId(company.id)
    setError('')
    setNotice('')

    try {
      const response = await fetch(
        `/api/companies/${company.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      if (response.status === 409) {
        throw new Error(
          'This company has linked job applications. ' +
          'Remove or reassign those applications first.'
        )
      }

      if (!response.ok) {
        throw new Error(
          `Could not delete company (${response.status}).`
        )
      }

      setCompanies((current) =>
        current.filter((c) => c.id !== company.id)
      )

      if (editingId === company.id) resetForm()

      setNotice('Company deleted successfully!')

      await refreshDashboard()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const busy = saving || deletingId !== null

  return (
    <section className="companies-panel">
      <div className="companies-heading">
        <div>
          <h2>My Companies</h2>
          <p>Manage the companies in your job search.</p>
        </div>

        <button
          type="button"
          className="add-company-button"
          disabled={busy}
          onClick={() => {
            if (showForm) {
              resetForm()
            } else {
              openCreate()
            }
          }}
        >
          {showForm ? 'Cancel' : '+ Add Company'}
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
        <form className="company-form" onSubmit={handleSubmit}>
          <h3>
            {editingId ? 'Edit Company' : 'Add Company'}
          </h3>

          <label htmlFor="companyName">
            Company Name
          </label>
          <input
            id="companyName"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="e.g. BMW Group"
            maxLength={200}
            required
          />

          <label htmlFor="companyWebsite">
            Website (optional)
          </label>
          <input
            id="companyWebsite"
            type="url"
            value={website}
            onChange={(event) =>
              setWebsite(event.target.value)
            }
            placeholder="https://example.com"
            maxLength={2048}
          />

          <label htmlFor="companyLocation">
            Location (optional)
          </label>
          <input
            id="companyLocation"
            value={location}
            onChange={(event) =>
              setLocation(event.target.value)
            }
            placeholder="e.g. Munich, Germany"
            maxLength={200}
          />

          <button
            className="submit-button"
            type="submit"
            disabled={busy}
          >
            {saving
              ? 'Saving...'
              : editingId
                ? 'Save Changes'
                : 'Save Company'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="company-empty">Loading companies...</p>
      ) : companies.length === 0 ? (
        <div className="company-empty">
          <h3>No companies yet</h3>
          <p>
            Add your first company to start organizing
            your applications.
          </p>
        </div>
      ) : (
        <div className="company-list">
          {companies.map((company) => (
            <article className="company-item" key={company.id}>
              <div className="company-avatar">
                {company.name.charAt(0).toUpperCase()}
              </div>

              <div className="company-details">
                <h3>{company.name}</h3>
                <p>
                  {company.location || 'No location added'}
                </p>

                {company.website && (
                  <small>{company.website}</small>
                )}
              </div>

              <div className="company-actions">
                <button
                  type="button"
                  className="edit-company-button"
                  disabled={busy}
                  onClick={() => openEdit(company)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="delete-company-button"
                  disabled={busy}
                  onClick={() => void handleDelete(company)}
                >
                  {deletingId === company.id
                    ? 'Deleting...'
                    : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
