import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Servobill',
		short_name: 'Servobill',
		description: 'Servobill Invoicing App',
		start_url: '/',
		display: 'standalone',
		background_color: '#1F2937',
		theme_color: '#1F2937',
		icons: [
			{
				src: '/favicon-96x96.png',
				sizes: '96x96',
				type: 'image/png',
			},
			{
				src: '/favicon-96x96.png',
				sizes: '192x192',
				type: 'image/png',
			},
			{
				src: '/favicon-96x96.png',
				sizes: '512x512',
				type: 'image/png',
			},
			{
				src: '/favicon-96x96.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'maskable',
			},
		],
	};
}
