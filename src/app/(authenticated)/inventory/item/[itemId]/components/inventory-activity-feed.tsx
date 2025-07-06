import React from 'react';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
	ClockIcon,
	ChatBubbleLeftRightIcon,
	CheckCircleIcon,
	ExclamationCircleIcon,
	ArrowPathIcon,
	PencilIcon,
} from '@heroicons/react/24/outline';

import { InventoryActivityForm } from './inventory-activity-form';

import {
	InventoryHistoryType,
	InventoryCheckState,
} from '@/common/gql/graphql';

dayjs.extend(relativeTime);

export interface InventoryActivityFeedProps {
	history: Array<{
		type: InventoryHistoryType;
		state?: InventoryCheckState | null;
		date: string;
		note?: string | null;
	}>;
	itemId: string;
	reload: () => void;
}

const getHistoryIcon = (
	type: InventoryHistoryType,
	state?: InventoryCheckState | null,
) => {
	switch (type) {
		case InventoryHistoryType.Note: {
			return <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-500" />;
		}
		case InventoryHistoryType.Check: {
			switch (state) {
				case InventoryCheckState.Pass: {
					return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
				}
				case InventoryCheckState.Fail: {
					return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
				}
				case InventoryCheckState.Recheck: {
					return <ArrowPathIcon className="h-5 w-5 text-yellow-500" />;
				}
				// No default
			}
			return <CheckCircleIcon className="h-5 w-5 text-gray-400" />;
		}
		case InventoryHistoryType.StateChange: {
			return <ClockIcon className="h-5 w-5 text-gray-400" />;
		}
		case InventoryHistoryType.Update: {
			return <PencilIcon className="h-5 w-5 text-gray-400" />;
		}
		default: {
			return <ClockIcon className="h-5 w-5 text-gray-400" />;
		}
	}
};

const getHistoryText = (
	entry: InventoryActivityFeedProps['history'][number],
) => {
	switch (entry.type) {
		case InventoryHistoryType.Note: {
			return 'Note added';
		}
		case InventoryHistoryType.Check: {
			if (entry.state === InventoryCheckState.Pass) {
				return 'Check passed';
			}
			if (entry.state === InventoryCheckState.Fail) {
				return 'Check failed';
			}
			if (entry.state === InventoryCheckState.Recheck) {
				return 'Needs recheck';
			}
			return 'Check performed';
		}
		case InventoryHistoryType.StateChange: {
			return 'State changed';
		}
		case InventoryHistoryType.Update: {
			return 'Item updated';
		}
		default: {
			return 'Activity';
		}
	}
};

export const InventoryActivityFeed: React.FC<InventoryActivityFeedProps> = ({
	history,
	itemId,
	reload,
}) => {
	return (
		<div className="mx-4">
			<h2 className="text-base font-semibold leading-6 text-gray-900 mb-2">
				Activity & History
			</h2>
			{history && history.length > 0 ? (
				<ul className="space-y-4 mb-6">
					{history.map((entry, idx) => (
						<li key={idx} className="w-full flex items-start gap-3">
							<div className="flex-shrink-0 mt-0">
								{getHistoryIcon(entry.type, entry.state)}
							</div>
							<div className="flex-1 flex flex-col">
								<div className="flex flex-row justify-between items-center gap-2">
									<span className="text-sm text-gray-700 font-semibold">
										{getHistoryText(entry)}
									</span>
									<span className="text-xs text-gray-400">
										{dayjs(entry.date).fromNow()}
									</span>
								</div>
								{entry.note && entry.type !== InventoryHistoryType.Note && (
									<div className="text-xs text-gray-500 mt-1">{entry.note}</div>
								)}
							</div>
						</li>
					))}
				</ul>
			) : (
				<div className="text-gray-400 text-sm mb-6">No activity yet.</div>
			)}
			<InventoryActivityForm itemId={itemId} reload={reload} />
		</div>
	);
};
