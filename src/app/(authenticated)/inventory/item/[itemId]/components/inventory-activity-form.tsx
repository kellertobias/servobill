import React from 'react';
import clsx from 'clsx';

import { UserCircleIcon } from '@heroicons/react/20/solid';

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

export interface InventoryActivityFormProps {
	itemId: string;
	reload?: () => void;
}

export const InventoryActivityForm: React.FC<InventoryActivityFormProps> = ({
	itemId,
	reload,
}) => {
	const [note, setNote] = React.useState('');
	const [checkState, setCheckState] = React.useState<InventoryCheckState | ''>(
		'',
	);
	const [submitting, setSubmitting] = React.useState(false);

	const ref = useAutoSizeTextArea(
		note ||
			(checkState ? 'Optional note for check result...' : 'Add a note...'),
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			if (checkState) {
				await API.query({
					query: gql(`
            mutation AddInventoryCheck($id: String!, $state: InventoryCheckState!, $note: String) {
              addInventoryCheck(id: $id, state: $state, note: $note)
            }
          `),
					variables: { id: itemId, state: checkState, note: note || undefined },
				});
			} else if (note) {
				await API.query({
					query: gql(`
            mutation AddInventoryNote($id: String!, $note: String!) {
              addInventoryNote(id: $id, note: $note)
            }
          `),
					variables: { id: itemId, note },
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
			reload?.();
		} catch {
			doToast({ message: 'Failed to add history entry', type: 'danger' });
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={clsx('mt-6 flex gap-x-3 w-full flex-row -mr-px')}>
			<UserCircleIcon
				className={clsx(
					'h-6 w-6 flex-none rounded-full bg-gray-50 text-gray-300',
				)}
			/>
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
							disabled={submitting || (!note && !checkState)}
						>
							{checkState ? 'Add Result' : 'Add Note'}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
};
