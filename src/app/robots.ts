import type { MetadataRoute } from 'next';
import { productConfig } from '@/config/product';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${productConfig.siteUrl}/sitemap.xml`,
  };
}
