
import { describe, expect, it } from 'vitest'
import {
  csvCell,
  filterAndSortApplications,
} from './applicationUtils'

const applications = [
  {
    id: '1',
    companyName: 'Zeta GmbH',
    jobTitle: 'Data Intern',
    status: 'Applied',
    deadlineDate: '2026-11-20',
    createdAtUtc: '2026-11-10T10:00:00Z',
  },
  {
    id: '2',
    companyName: 'Alpha GmbH',
    jobTitle: 'Web Developer',
    status: 'Draft',
    deadlineDate: null,
    createdAtUtc: '2026-11-14T10:00:00Z',
  },
  {
    id: '3',
    companyName: 'Beta GmbH',
    jobTitle: 'AI Intern',
    status: 'Interview',
    deadlineDate: '2026-11-17',
    createdAtUtc: '2026-11-12T10:00:00Z',
  },
]

function ids(items: typeof applications) {
  return items.map((item) => item.id)
}

describe('Application filtering', () => {
  it('finds applications by company name', () => {
    const result = filterAndSortApplications(
      applications,
      '  ZETA  ',
      'All',
      'newest'
    )

    expect(ids(result)).toEqual(['1'])
  })

  it('finds applications by job title', () => {
    const result = filterAndSortApplications(
      applications,
      'web',
      'All',
      'newest'
    )

    expect(ids(result)).toEqual(['2'])
  })

  it('filters applications by status', () => {
    const result = filterAndSortApplications(
      applications,
      '',
      'Interview',
      'newest'
    )

    expect(ids(result)).toEqual(['3'])
  })

  it('returns an empty list when nothing matches', () => {
    const result = filterAndSortApplications(
      applications,
      'Nonexistent Company',
      'All',
      'newest'
    )

    expect(result).toEqual([])
  })
})

describe('Application sorting', () => {
  it('sorts newest first', () => {
    const result = filterAndSortApplications(
      applications,
      '',
      'All',
      'newest'
    )

    expect(ids(result)).toEqual(['2', '3', '1'])
  })

  it('sorts oldest first', () => {
    const result = filterAndSortApplications(
      applications,
      '',
      'All',
      'oldest'
    )

    expect(ids(result)).toEqual(['1', '3', '2'])
  })

  it('sorts approaching deadlines first', () => {
    const result = filterAndSortApplications(
      applications,
      '',
      'All',
      'deadline'
    )

    expect(ids(result)).toEqual(['3', '1', '2'])
  })

  it('sorts companies alphabetically', () => {
    const result = filterAndSortApplications(
      applications,
      '',
      'All',
      'company'
    )

    expect(ids(result)).toEqual(['2', '3', '1'])
  })

  it('does not modify the original array', () => {
    const originalOrder = ids(applications)

    filterAndSortApplications(
      applications,
      '',
      'All',
      'company'
    )

    expect(ids(applications)).toEqual(originalOrder)
  })
})

describe('CSV formatting', () => {
  it('wraps ordinary values in quotes', () => {
    expect(csvCell('ApplyFlow')).toBe('"ApplyFlow"')
  })

  it('preserves commas inside a field', () => {
    expect(csvCell('Sereact, GmbH'))
      .toBe('"Sereact, GmbH"')
  })

  it('escapes double quotes', () => {
    expect(csvCell('He said "yes"'))
      .toBe('"He said ""yes"""')
  })

  it('handles missing values', () => {
    expect(csvCell(null)).toBe('""')
  })

  it('prefixes formula-like values', () => {
    expect(csvCell('=1+1')).toBe("\"'=1+1\"")
  })
})
