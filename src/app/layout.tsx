import type { Metadata } from 'next';
import { Anton, Barlow } from 'next/font/google';
import { productConfig } from '@/config/product';
import { SiteHeader } from '@/components/site-header';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import './ticket-theme.css';
import './product-ui.css';

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const barlow = Barlow({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-interface',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(productConfig.siteUrl),
  title: {
    default: `${productConfig.name} — A calmer way to wait`,
    template: `%s — ${productConfig.name}`,
  },
  description: productConfig.statement,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: productConfig.name,
    title: `${productConfig.name} — A calmer way to wait`,
    description: productConfig.statement,
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${anton.variable} ${barlow.variable}`}
    >
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <ThemeProvider>
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
