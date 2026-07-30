import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Smart School Management System',
    short_name: 'Smart School',
    description: 'Unified School Management Portal',
    start_url: '/',
    display: 'standalone',
    background_color: '#1e3848',
    theme_color: '#1e3848',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
