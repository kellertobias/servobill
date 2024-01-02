import React from 'react';
import { Params } from 'next/dist/shared/lib/router/utils/route-matcher';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import useDebouncedMemo from '@sevenoutman/use-debounced-memo';

import { API, gql } from '@/api/index';

export type UseLoadData<T> = {
	error: null | string;
	initialData: T | null;
	loading: boolean;
	data: T | null;
	setData: React.Dispatch<React.SetStateAction<Partial<T> | null>>;
	reload: () => void;
};

export const useLoadData = <
	T,
	X extends Record<string, unknown> = Record<string, never>,
>(
	loader: (params: Params & X) => Promise<T | null>,
	externalParameters?: X,
): UseLoadData<T> => {
	const params = useParams();
	const [error, setHasError] = useState<null | string>(null);
	const [initialData, setInitialData] = useState<T | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [currentData, setCurrentData] = useState<T | null>(null);
	const hash = JSON.stringify({ ...params, ...externalParameters });
	const loadData = useCallback(async () => {
		try {
			setIsLoading(true);
			setHasError(null);
			const data = await loader({ ...params, ...externalParameters } as Params &
				X);
			setInitialData(window.structuredClone(data));
			setCurrentData(window.structuredClone(data));
			setIsLoading(false);
		} catch (error) {
			setHasError(String(error));
			setIsLoading(false);
			return;
		}
	}, [hash]);

	useEffect(() => {
		loadData();
	}, [hash]);

	return {
		error,
		initialData,
		loading: isLoading,
		data: currentData,
		setData: setCurrentData as React.Dispatch<
			React.SetStateAction<Partial<T> | null>
		>,
		reload: loadData,
	};
};

export const useHasChanges = <T>(
	initialData: Partial<T> | null,
	currentData: Partial<T> | null,
	mapper: (data: Partial<T> | null) => unknown = (data) => data,
	debounceTime = 200,
): boolean => {
	return useDebouncedMemo(
		() => {
			const a = JSON.stringify(mapper(initialData));
			const b = JSON.stringify(mapper(currentData));
			return a !== b;
		},
		[initialData, currentData],
		debounceTime,
	);
};

export const useSaveCallback = <T>({
	id,
	entityName,
	data,
	initialData,
	mapper,
	openCreated,
	reload,
	hasChanges: hasChangesProp,
}: {
	id: string;
	entityName: string;
	data: T;
	initialData: T;
	mapper?: (data: NonNullable<T>) => unknown;
	openCreated?: (id: string) => void;
	reload?: () => void;
	hasChanges?: boolean;
}) => {
	const hasChanges =
		hasChangesProp || useHasChanges(initialData as never, data as never);
	const isNew = id === 'new';
	const query = isNew
		? gql(`mutation Create${entityName}($data: ${entityName}Input!) {
		create: create${entityName}(data: $data) {
			id
		}
			}
			`)
		: gql(`
			mutation Update${entityName}($id: String!, $data: ${entityName}Input!) {
				update: update${entityName}(id: $id, data: $data) {
					id
				}
			}
			`);

	const onSave =
		hasChanges && data
			? async () => {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id: dataId, ...rest } = data as T & { id: string };
					const response = (await API.query({
						query: query as never,
						variables: {
							id,
							data: mapper ? mapper(data) : rest,
						},
					})) as { create?: { id: string }; update?: { id: string } };

					if (isNew) {
						if (response.create?.id) {
							openCreated?.(response.create?.id);
						}
					} else {
						reload?.();
					}
				}
			: undefined;

	return {
		hasChanges,
		onSave,
	};
};
