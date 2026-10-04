import Link from 'next/link';
import { productConfig } from '@/config/product';

export function SiteFooter() {
  return (
    <footer className="page-shell footer">
      <span>© 2026 {productConfig.name}. All rights reserved.</span>
      <Link className="text-link" href="/privacy">
        Privacy
      </Link>
    </footer>
  );
}
