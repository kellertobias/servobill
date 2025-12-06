import 'reflect-metadata';
import type { SESEvent } from 'aws-lambda';
import { DefaultContainer } from '@/common/di';
import { InboundEmailProcessor } from './processor';

export const handler = async (event: SESEvent): Promise<void> => {
	const processor = DefaultContainer.get(InboundEmailProcessor);
	await processor.process(event);
};
