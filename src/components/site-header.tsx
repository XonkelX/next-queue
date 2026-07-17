'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { productConfig } from '@/config/product';
import { ThemeToggle } from './theme-toggle';

const links = [
  { href: '/demo', label: 'Demo' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/about', label: 'About' },
];

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname.endsWith('/display')) return null;

  return (
    <header className="site-header">
      <Link
        className="brand"
        href="/"
        aria-label={`${productConfig.name} home`}
      >
        <span className="brand-mark" aria-hidden="true" />
        {productConfig.name}
      </Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {links.map((link) => (
          <Link href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <ThemeToggle />
        <details className="mobile-nav">
          <summary className="icon-button" aria-label="Open navigation menu">
            <Menu aria-hidden="true" size={19} />
          </summary>
          <nav className="mobile-menu" aria-label="Mobile navigation">
            {links.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
