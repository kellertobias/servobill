import React from 'react';
import clsx from 'clsx';

import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { doToast } from '@/components/toast';
import SelectInput from '@/components/select-input';
import { useAutoSizeTextArea } from '@/hooks/use-auto-textarea';

import { InventoryCheckState } from '@/common/gql/graphql';

const CHECK_STATES = [
	{ value: '', label: 'Add Check' },
	{ value: 'PASS', label: 'PASS' },
	{ value: 'RECHECK', label: 'RECHECK' },
	{ value: 'FAIL', label: 'FAIL' },
];

/**
 * Props for InventoryActivityForm.
 * @property itemId - The ID of the inventory item to add history to.
 * @property reload - Callback to reload the parent data after successful submission.
 */
export interface InventoryActivityFormProps {
	itemId: string;
	reload: () => void; // Now required
}

/**
 * InventoryActivityForm allows users to add a note or a check result to an inventory item's history.
 * - If a check state is selected, it submits a check (optionally with a note).
 * - If only a note is entered, it submits a note.
 * - After successful submission, it resets the form and triggers reload.
 *
 * @param itemId - The inventory item ID
 * @param reload - Callback to reload parent data
 */
export const InventoryActivityForm: React.FC<InventoryActivityFormProps> = ({
	itemId,
	reload,
}) => {
	const [note, setNote] = React.useState('');
	const [checkState, setCheckState] = React.useState<InventoryCheckState | ''>(
		'',
	);
	const [submitting, setSubmitting] = React.useState(false);

	// Autosize textarea based on content or placeholder
	const ref = useAutoSizeTextArea(
		note ||
			(checkState ? 'Optional note for check result...' : 'Add a note...'),
	);

	/**
	 * Handles form submission for adding a note or check.
	 * Prevents whitespace-only notes. Logs actions for debugging.
	 */
	const handleSubmit = async () => {
		setSubmitting(true);
		try {
			// Prevent submitting whitespace-only notes
			const trimmedNote = note.trim();
			if (checkState) {
				await API.query({
					query: gql(`
						mutation AddInventoryCheck($id: String!, $state: InventoryCheckState!, $note: String) {
							addInventoryCheck(id: $id, state: $state, note: $note)
						}
          			`),
					variables: {
						id: itemId,
						state: checkState,
						note: trimmedNote || undefined,
					},
				});
			} else if (trimmedNote) {
				await API.query({
					query: gql(`
            mutation AddInventoryNote($id: String!, $note: String!) {
              addInventoryNote(id: $id, note: $note)
            }
          `),
					variables: { id: itemId, note: trimmedNote },
				});
			} else {
				doToast({
					message: 'Please enter a note or select a check state.',
					type: 'danger',
				});
				setSubmitting(false);
				return;
			}
			setNote('');
			setCheckState('');
			doToast({ message: 'History entry added!', type: 'success' });
			reload();
		} catch (error) {
			// Log error for debugging
			console.error('Failed to add history entry', error);
			doToast({ message: 'Failed to add history entry', type: 'danger' });
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={clsx('mt-6 flex gap-x-3 w-full flex-row -mr-px')}>
			<form
				className={clsx('relative flex-grow min-w-0')}
				onSubmit={handleSubmit}
			>
				<div
					className={clsx(
						'overflow-hidden w-full rounded-lg pb-[52px] shadow-sm',
						'ring-1 ring-inset ring-gray-300 bg-white',
						'focus-within:ring-2 focus-within:ring-blue-600',
					)}
				>
					<div className={clsx('flex p-[2px]')}>
						<textarea
							id="note"
							ref={ref}
							className={clsx(
								'block w-full rounded-t-md border-gray-300 text-sm',
								'resize-none min-h-[40px] max-h-60 overflow-auto p-3 pb-1',
							)}
							rows={2}
							placeholder={
								checkState
									? 'Optional note for check result...'
									: 'Add a note...'
							}
							value={note}
							onChange={(e) => setNote(e.target.value)}
							disabled={submitting}
						/>
					</div>
					<div
						className={clsx(
							'absolute border-t border-t-gray-200 bg-gray-100/50',
							'bottom-0 left-0.5 right-0.5',
							'flex flex-row items-end justify-end pb-2 px-2 gap-2',
						)}
					>
						<div className={clsx('flex-1 max-w-xs')}>
							<SelectInput
								clearable={false}
								value={checkState || ''}
								onChange={(val) =>
									setCheckState((val ?? '') as InventoryCheckState | '')
								}
								options={CHECK_STATES}
								placeholder="Check State"
								className="w-full"
							/>
						</div>
						<Button
							primary
							className="h-[38px] min-w-[110px]"
							disabled={submitting || (!note.trim() && !checkState)}
							onClick={() => handleSubmit()}
						>
							{checkState ? 'Add Result' : 'Add Note'}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
};
