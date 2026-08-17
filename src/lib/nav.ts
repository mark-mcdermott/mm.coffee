export interface NavItem {
  href: string
  label: string
}

export const NAV: NavItem[] = [
  { href: '/batches', label: 'Batches' },
  { href: '/press', label: 'Press' },
  { href: '/company', label: 'Company' },
  { href: '/mailroom', label: 'Mailroom' },
]
