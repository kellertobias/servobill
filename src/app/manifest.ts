import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Tobisk Faktura',
		short_name: 'Tobisk Faktura',
		description: 'Tobisk Faktura Billing',
		start_url: '/',
		display: 'standalone',
		background_color: '#1F2937',
		theme_color: '#1F2937',
		icons: [
			{
				src: '/favicon-96x96.png',
				sizes: 'any',
				type: 'image/png',
			},
		],
	};
}
