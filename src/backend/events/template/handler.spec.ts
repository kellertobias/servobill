import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerateInvoiceHtmlCommand } from '@/backend/cqrs/generate-invoice-html/generate-invoice-html.command';
import { CreatePdfCommand } from '@/backend/cqrs/generate-pdf/create-pdf.command';
import { CqrsBus } from '@/backend/services/cqrs.service';
import { DefaultContainer } from '@/common/di';
import { handler } from './handler';

// Mock dependencies
vi.mock('@/backend/services/cqrs.service', async (importOriginal) => {
	const actual = await importOriginal<any>();
	return {
		...actual,
		CqrsBus: {
			...actual.CqrsBus,
			forRoot: vi.fn(),
		},
	};
});
vi.mock('@/common/di', async (importOriginal) => {
	const actual = await importOriginal<any>();
	return {
		...actual,
		DefaultContainer: {
			...actual.DefaultContainer,
			get: vi.fn(),
		},
	};
});
vi.mock('@/backend/services/file-storage.service');

describe('template handler', () => {
	let mockBus: any;
	let mockFileStorage: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let context: any;

	const validData = {
		invoiceNumber: 'INV-001',
		customerNumber: 'CUST-001',
		offerNumber: 'OFFER-001',
		logo: 'logo.png',
		company: {
			name: 'My Company',
			street: 'Street',
			zip: '12345',
			city: 'City',
			phone: '123456',
			email: 'test@example.com',
			web: 'example.com',
			vatId: 'DE123456789',
			taxId: '123/456/789',
			bank: {
				accountHolder: 'Me',
				iban: 'DE000000',
				bic: 'GENERIC',
			},
			countryCode: 'DE',
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockBus = {
			execute: vi.fn(),
		};
		(CqrsBus.forRoot as any).mockReturnValue(mockBus);

		mockFileStorage = {
			saveFile: vi.fn(),
		};
		(DefaultContainer.get as any).mockReturnValue(mockFileStorage);

		context = {
			awsRequestId: 'req-id',
			getRemainingTimeInMillis: vi.fn().mockReturnValue(1000),
			memoryLimitInMB: '128',
			// Logger will be created by makeEventHandler
		};
	});

	it('should generate html and upload it when pdf is false', async () => {
		const eventDetail = {
			pdf: false,
			template: '<h1>Template</h1>',
			styles: 'body {}',
			key: 'test-key',
			data: validData,
		};

		const event: any = {
			'detail-type': 'GenerateTemplatePreviewEvent',
			detail: eventDetail,
			id: 'test-event-id',
		};

		// Mock bus.execute for GenerateInvoiceHtmlCommand
		mockBus.execute.mockResolvedValueOnce({ html: '<html>Result</html>' });

		await handler(event, context, () => {});

		expect(CqrsBus.forRoot).toHaveBeenCalled();
		expect(mockBus.execute).toHaveBeenCalledWith(
			expect.any(GenerateInvoiceHtmlCommand),
		);
		expect(mockFileStorage.saveFile).toHaveBeenCalledWith(
			'test-key',
			Buffer.from('<html>Result</html>'),
		);
	});

	it('should generate pdf when pdf is true', async () => {
		const eventDetail = {
			pdf: true,
			template: '<h1>Template</h1>',
			styles: 'body {}',
			key: 'test-key',
			data: validData,
		};

		const event: any = {
			'detail-type': 'GenerateTemplatePreviewEvent',
			detail: eventDetail,
			id: 'test-event-id',
		};

		mockBus.execute.mockResolvedValueOnce({ html: '<html>Result</html>' });
		mockBus.execute.mockResolvedValueOnce({}); // CreatePdfCommand result

		await handler(event, context, () => {});

		expect(mockBus.execute).toHaveBeenCalledTimes(2);
		expect(mockBus.execute).toHaveBeenNthCalledWith(
			1,
			expect.any(GenerateInvoiceHtmlCommand),
		);
		expect(mockBus.execute).toHaveBeenNthCalledWith(
			2,
			expect.any(CreatePdfCommand),
		);
		expect(mockFileStorage.saveFile).not.toHaveBeenCalled();
	});
});
