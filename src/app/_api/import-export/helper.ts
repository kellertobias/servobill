import { doToast } from '@/components/toast';

export const requestFile = async () => {
	try {
		return new Promise<string | null>((resolve, reject) => {
			const input = document.createElement('input');
			input.type = 'file';

			input.addEventListener('change', (e) => {
				console.log('file changed, start reading...', e);
				// getting a hold of the file reference
				const file = (e.target as HTMLInputElement)?.files?.[0];
				if (!file) {
					return reject('No File Selected');
				}
				// setting up the reader
				const reader = new FileReader();
				reader.readAsText(file, 'utf8');

				// here we tell the reader what to do when it's done reading...
				reader.addEventListener('load', (readerEvent): void => {
					const content = readerEvent.target?.result; // this is the content!
					if (typeof content !== 'string') {
						return reject('Failed to read file');
					}
					console.log('file read, resolving...', { length: content.length });
					resolve(content);
				});
			});

			input.click();
		});
	} catch (error) {
		console.error(error);
		doToast({
			type: 'danger',
			message: String(error) || 'Failed to select your file.',
		});
		return null;
	}
};

export const downloadFile = (options: {
	filename: string;
	content: string;
	type?: string;
}) => {
	const dataUri = `data:${
		options.type || 'application/json;charset=utf-8'
	},${encodeURIComponent(options.content)}`;

	const linkElement = document.createElement('a');
	linkElement.setAttribute('href', dataUri);
	linkElement.setAttribute('download', options.filename);
	linkElement.click();
};
