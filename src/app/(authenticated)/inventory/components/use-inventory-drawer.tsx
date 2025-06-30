import React, { useImperativeHandle } from 'react';

export const useInventoryDrawer = ({
	ref,
}: {
	ref: React.Ref<{ openDrawer: (id: string) => void }>;
}) => {
	const [drawerId, setDrawerId] = React.useState<string | null>(null);

	// Expose openDrawer(id) to parent via ref
	useImperativeHandle(ref, () => ({
		openDrawer: (newId: string) => {
			setDrawerId(newId);
		},
	}));

	// Reset drawer state when closed
	const handleClose = () => {
		setDrawerId(null);
	};

	return {
		drawerId,
		handleClose,
	};
};
