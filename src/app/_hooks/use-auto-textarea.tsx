import { useEffect, useState } from 'react';

// Updates the height of a <textarea> when the value changes.
export const useAutoSizeTextArea = (value: string) => {
	const [textArea, setTextArea] = useState<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		if (textArea) {
			// We need to reset the height momentarily to get the correct scrollHeight for the textarea
			textArea.style.height = '0px';
			const scrollHeight = textArea.scrollHeight;

			// We then set the height directly, outside of the render loop
			// Trying to set this with state or a ref will product an incorrect value.
			textArea.style.height = scrollHeight + 'px';
		}
	}, [textArea, value]);

	return setTextArea;
};
