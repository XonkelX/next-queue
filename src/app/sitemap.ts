import type { MetadataRoute } from 'next';
import { productConfig } from '@/config/product';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/demo', '/about'].map((path) => ({
    url: `${productConfig.siteUrl}${path}`,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
