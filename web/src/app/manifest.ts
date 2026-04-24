import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'working',
    short_name: 'working',
    description: 'Conectando você ao profissional certo',
    start_url: '/',
    display: 'standalone',
    background_color: '#141B25',
    theme_color: '#141B25',
  };
}
