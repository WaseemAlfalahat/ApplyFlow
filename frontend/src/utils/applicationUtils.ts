
export type SortMode =
  | 'newest'
  | 'oldest'
  | 'deadline'
  | 'company'

export type ApplicationSummary = {
  jobTitle: string
  companyName: string
  status: string
  deadlineDate: string | null
  createdAtUtc: string
}

export function filterAndSortApplications<
  T extends ApplicationSummary
>(
  applications: readonly T[],
  search: string,
  statusFilter: string,
  sortBy: SortMode
): T[] {
  const query = search.trim().toLowerCase()

  const filtered = applications.filter((application) => {
    const matchesSearch =
      application.jobTitle.toLowerCase().includes(query) ||
      application.companyName.toLowerCase().includes(query)

    const matchesStatus =
      statusFilter === 'All' ||
      application.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return [...filtered].sort((a, b) => {
    if (sortBy === 'oldest') {
      return a.createdAtUtc.localeCompare(b.createdAtUtc)
    }

    if (sortBy === 'deadline') {
      const dateA = a.deadlineDate ?? '9999-12-31'
      const dateB = b.deadlineDate ?? '9999-12-31'

      return (
        dateA.localeCompare(dateB) ||
        b.createdAtUtc.localeCompare(a.createdAtUtc)
      )
    }

    if (sortBy === 'company') {
      return (
        a.companyName.localeCompare(b.companyName) ||
        a.jobTitle.localeCompare(b.jobTitle)
      )
    }

    return b.createdAtUtc.localeCompare(a.createdAtUtc)
  })
}

export function csvCell(
  value: string | null | undefined
): string {
  const raw = value ?? ''

  const safe = /^[=+\-@]/.test(raw.trimStart())
    ? "'" + raw
    : raw

  return `"${safe.replace(/"/g, '""')}"`
}
