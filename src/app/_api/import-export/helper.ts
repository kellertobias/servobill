import Papa from 'papaparse';

import { doToast } from '@/components/toast';

export const requestFile = async () => {
	try {
		return new Promise<string | null>((resolve, reject) => {
			const input = document.createElement('input');
			input.type = 'file';

			input.addEventListener('change', (e) => {
				// eslint-disable-next-line no-console
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
						reject('Failed to read file');
						return;
					}
					// eslint-disable-next-line no-console
					console.log('file read, resolving...', { length: content.length });
					resolve(content);
				});
			});

			input.click();
		});
	} catch (error) {
		// eslint-disable-next-line no-console
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

/**
 * Parses a CSV string or File in the browser and returns an array of objects keyed by header.
 * Uses PapaParse if available, otherwise falls back to a simple parser (not RFC-complete).
 * @param fileOrString - The File object or CSV string to parse
 * @returns Promise resolving to an array of objects (rows)
 */
export async function parseCsvFileOrString(
	fileOrString: File | string,
): Promise<Record<string, string>[]> {
	// Try to use PapaParse if available (recommended for robust parsing)
	try {
		return await new Promise((resolve, reject) => {
			if (typeof fileOrString === 'string') {
				const result = Papa.parse(fileOrString, {
					header: true,
					skipEmptyLines: true,
					transformHeader: (header) => header.trim().toLowerCase(),
				});
				if (result.errors && result.errors.length > 0) {
					reject(result.errors);
				} else {
					resolve(result.data as Record<string, string>[]);
				}
			} else {
				Papa.parse(fileOrString, {
					header: true,
					skipEmptyLines: true,
					transformHeader: (header) => header.trim().toLowerCase(),
					complete: (results: {
						data: Record<string, string>[];
						errors: unknown[];
					}) => {
						if (results.errors && results.errors.length > 0) {
							reject(results.errors);
						} else {
							resolve(results.data);
						}
					},
					error: reject,
				});
			}
		});
	} catch {
		// Fallback: very basic CSV parser (assumes comma, no quoted fields)
		// Only use for simple files, not production-grade!
		// eslint-disable-next-line no-console
		console.warn(
			'PapaParse not found, using fallback CSV parser. Install papaparse for robust parsing.',
		);
		let csv = '';
		csv =
			typeof fileOrString === 'string'
				? fileOrString
				: await fileOrString.text();
		const [headerLine, ...lines] = csv.split(/\r?\n/).filter(Boolean);
		const headers = headerLine.split(',').map((h) => h.trim());
		return lines.map((line) => {
			const values = line.split(',');
			const obj: Record<string, string> = {};
			headers.forEach((h, i) => {
				obj[h] = values[i]?.trim() || '';
			});
			return obj;
		});
	}
}
