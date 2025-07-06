import React from 'react';
import clsx from 'clsx';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
	ClockIcon,
	ChatBubbleLeftRightIcon,
	CheckCircleIcon,
	ExclamationCircleIcon,
	ArrowPathIcon,
	PencilIcon,
} from '@heroicons/react/20/solid';

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
				default: {
					return <CheckCircleIcon className="h-5 w-5 text-gray-400" />;
				}
			}
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
				<ul role="list" className="mt-6 space-y-6">
					{history?.map(
						(activity, index) =>
							activity && (
								<li key={index} className="relative flex gap-x-4">
									<div
										className={clsx(
											index === history.length - 1 ? 'h-6' : '-bottom-6',
											'absolute left-0 top-0 flex w-6 justify-center',
										)}
									>
										<div className="w-px bg-gray-200" />
									</div>
									<>
										<div className="relative flex h-6 w-6 flex-none items-center justify-center bg-white">
											{getHistoryIcon(activity.type, activity.state)}
										</div>
										<div className="flex flex-col w-full">
											<div className="flex flex-row justify-between gap-x-4 w-full">
												<p className="flex-auto py-0.5 text-xs leading-5 text-gray-500 font-semibold">
													{getHistoryText(activity)}
												</p>
												<time
													dateTime={activity.date}
													className="flex-none py-0.5 text-xs leading-5 text-gray-500"
												>
													{dayjs(activity.date).fromNow()}
												</time>
											</div>
											<p className="flex-auto py-0.5 text-xs leading-5 text-gray-500">
												{activity.note}
											</p>
										</div>
									</>
								</li>
							),
					)}
				</ul>
			) : (
				<div className="text-gray-400 text-sm mb-6">No activity yet.</div>
			)}
			<InventoryActivityForm itemId={itemId} reload={reload} />
		</div>
	);
};
