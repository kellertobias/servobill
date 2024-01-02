export const requestFile = async () => {
	return new Promise<string | null>((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';

		input.addEventListener('change', (e) => {
			// getting a hold of the file reference
			const file = (e.target as HTMLInputElement)?.files?.[0];
			if (!file) {
				return resolve(null);
			}
			// setting up the reader
			const reader = new FileReader();
			reader.readAsText(file, 'utf8');

			// here we tell the reader what to do when it's done reading...
			reader.addEventListener('load', (readerEvent): void => {
				const content = readerEvent.target?.result; // this is the content!
				if (typeof content !== 'string') {
					return resolve(null);
				}
				resolve(content);
			});
		});

		input.click();
	});
};
