import 'reflect-metadata';
import { SESEvent } from 'aws-lambda';
import { InboundEmailProcessor } from './processor';
import { DefaultContainer } from '@/common/di';

export const handler = async (event: SESEvent): Promise<void> => {
	const processor = DefaultContainer.get(InboundEmailProcessor);
	await processor.process(event);
};
