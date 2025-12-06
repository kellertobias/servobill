import type React from 'react';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';

export const useInventoryDrawer = ({
	ref,
	onReload,
}: {
	ref: React.Ref<{ openDrawer: (id: string) => void }>;
	onReload: () => void;
}) => {
	const [drawerId, setDrawerId] = useState<string | null>(null);

	// Use a ref to store the pending parentId for new type creation
	const parentIdRef = useRef<string | undefined>(undefined);

	// Expose openDrawer(id) to parent via ref
	useImperativeHandle(ref, () => ({
		openDrawer: (id: string, parentId?: string) => {
			setDrawerId(id);
			parentIdRef.current = parentId;
		},
	}));

	// Reset drawer state when closed
	const handleClose = () => {
		setDrawerId(null);
	};

	const reloadRef = useRef<() => void>(() => {
		onReload?.();
	});

	useEffect(() => {
		reloadRef.current = onReload;
	}, [onReload]);

	return {
		drawerId,
		handleClose,
		parentIdRef,
		reloadRef,
	};
};
