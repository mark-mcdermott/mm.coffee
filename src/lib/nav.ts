export interface NavItem {
  href: string
  label: string
}

export const NAV: NavItem[] = [
  { href: '/programs', label: 'Batches' },
  { href: '/lab', label: 'PR' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]
