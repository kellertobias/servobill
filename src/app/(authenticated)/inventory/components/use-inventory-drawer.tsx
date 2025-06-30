import React, { useImperativeHandle } from 'react';

export const useInventoryDrawer = ({
	ref,
	reloadRef,
}: {
	ref: React.Ref<{ openDrawer: (id: string) => void }>;
	reloadRef: React.MutableRefObject<() => void>;
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
		if (reloadRef && typeof reloadRef.current === 'function') {
			reloadRef.current();
		}
	};

	return {
		drawerId,
		handleClose,
	};
};
