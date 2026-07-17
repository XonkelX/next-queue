import Link from 'next/link';
import { productConfig } from '@/config/product';

export function SiteFooter() {
  return (
    <footer className="page-shell footer">
      <span>
        © 2026 {productConfig.name}. A portfolio project by Oniel Alejo Feliz.
      </span>
      <Link className="text-link" href="/about">
        Privacy by design
      </Link>
    </footer>
  );
}
