import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { extractEmbeddedXmlWithPdfLib } from './extract-pdf-xml';

/**
 * Helper function to create a simple PDF with embedded XML file
 * This simulates an e-invoice PDF with XML attachment
 */
async function createPdfWithEmbeddedXml(xmlContent: string): Promise<Buffer> {
	const pdfDoc = await PDFDocument.create();

	// Add a simple page to make it a valid PDF
	const page = pdfDoc.addPage([600, 400]);
	page.drawText('Test PDF with embedded XML', {
		x: 50,
		y: 350,
		size: 12,
	});

	// Embed the XML file
	await pdfDoc.attach(
		new Uint8Array(Buffer.from(xmlContent, 'utf8')),
		'invoice.xml',
		{
			mimeType: 'application/xml',
			description: 'E-Invoice XML',
		},
	);

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

/**
 * Helper function to create a simple PDF without any embedded files
 */
async function createSimplePdf(): Promise<Buffer> {
	const pdfDoc = await PDFDocument.create();

	// Add a simple page
	const page = pdfDoc.addPage([600, 400]);
	page.drawText('Simple PDF without embedded files', {
		x: 50,
		y: 350,
		size: 12,
	});

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

describe('extractEmbeddedXmlWithPdfLib', () => {
	it('should extract XML from PDF with embedded XML file', async () => {
		const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<invoice>
	<number>INV-001</number>
	<date>2024-01-01</date>
	<amount>100.00</amount>
</invoice>`;

		const pdfBuffer = await createPdfWithEmbeddedXml(xmlContent);
		const result = await extractEmbeddedXmlWithPdfLib(pdfBuffer);

		expect(result).toBeDefined();
		expect(result).toContain('<?xml version="1.0"');
		expect(result).toContain('<invoice>');
		expect(result).toContain('<number>INV-001</number>');
	});

	it('should return undefined for PDF without embedded files', async () => {
		const pdfBuffer = await createSimplePdf();
		const result = await extractEmbeddedXmlWithPdfLib(pdfBuffer);

		expect(result).toBeUndefined();
	});

	it('should handle malformed XML in embedded file', async () => {
		const malformedXml = `<?xml version="1.0" encoding="UTF-8"?>
<invoice>
	<number>INV-001</number>
	<unclosed-tag>content
</invoice>`;

		const pdfBuffer = await createPdfWithEmbeddedXml(malformedXml);
		const result = await extractEmbeddedXmlWithPdfLib(pdfBuffer);

		// Should still return the content even if XML is malformed
		expect(result).toBeDefined();
		expect(result).toContain('<?xml version="1.0"');
	});

	it('should handle non-XML embedded file', async () => {
		const pdfDoc = await PDFDocument.create();
		const page = pdfDoc.addPage([600, 400]);
		page.drawText('PDF with non-XML attachment', {
			x: 50,
			y: 350,
			size: 12,
		});

		// Embed a non-XML file
		await pdfDoc.attach(
			new Uint8Array(Buffer.from('This is not XML content', 'utf8')),
			'document.txt',
			{
				mimeType: 'text/plain',
				description: 'Plain text file',
			},
		);

		const pdfBytes = await pdfDoc.save();
		const pdfBuffer = Buffer.from(pdfBytes);
		const result = await extractEmbeddedXmlWithPdfLib(pdfBuffer);

		expect(result).toBeUndefined();
	});

	it('should handle empty PDF buffer', async () => {
		const emptyBuffer = Buffer.alloc(0);
		const result = await extractEmbeddedXmlWithPdfLib(emptyBuffer);

		expect(result).toBeUndefined();
	});

	it('should handle invalid PDF buffer', async () => {
		const invalidBuffer = Buffer.from('This is not a PDF file', 'utf8');
		const result = await extractEmbeddedXmlWithPdfLib(invalidBuffer);

		expect(result).toBeUndefined();
	});

	it('should extract first XML file when multiple embedded files exist', async () => {
		const xmlContent1 = `<?xml version="1.0" encoding="UTF-8"?>
<invoice>
	<number>INV-001</number>
</invoice>`;

		const xmlContent2 = `<?xml version="1.0" encoding="UTF-8"?>
<invoice>
	<number>INV-002</number>
</invoice>`;

		const pdfDoc = await PDFDocument.create();
		const page = pdfDoc.addPage([600, 400]);
		page.drawText('PDF with multiple XML attachments', {
			x: 50,
			y: 350,
			size: 12,
		});

		// Embed multiple XML files
		await pdfDoc.attach(
			new Uint8Array(Buffer.from(xmlContent1, 'utf8')),
			'invoice1.xml',
			{
				mimeType: 'application/xml',
				description: 'First E-Invoice XML',
			},
		);

		await pdfDoc.attach(
			new Uint8Array(Buffer.from(xmlContent2, 'utf8')),
			'invoice2.xml',
			{
				mimeType: 'application/xml',
				description: 'Second E-Invoice XML',
			},
		);

		const pdfBytes = await pdfDoc.save();
		const pdfBuffer = Buffer.from(pdfBytes);
		const result = await extractEmbeddedXmlWithPdfLib(pdfBuffer);

		expect(result).toBeDefined();
		expect(result).toContain('<?xml version="1.0"');
		expect(result).toContain('<invoice>');
		// Should contain one of the XML contents (first found)
		expect(result).toMatch(/(INV-001|INV-002)/);
	});

	it('should handle XML with different encodings', async () => {
		const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<invoice>
	<description>Ümlaut tëst ñoñ-ASCII</description>
	<amount>€100.00</amount>
</invoice>`;

		const pdfBuffer = await createPdfWithEmbeddedXml(xmlContent);
		const result = await extractEmbeddedXmlWithPdfLib(pdfBuffer);

		expect(result).toBeDefined();
		expect(result).toContain('<?xml version="1.0"');
		expect(result).toContain('Ümlaut tëst ñoñ-ASCII');
		expect(result).toContain('€100.00');
	});

	it('should handle large XML content', async () => {
		// Create a large XML content
		let largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<invoice>
	<items>`;

		for (let i = 0; i < 1000; i++) {
			largeXml += `
		<item>
			<id>${i}</id>
			<name>Item ${i}</name>
			<price>${(i * 10).toFixed(2)}</price>
		</item>`;
		}

		largeXml += `
	</items>
</invoice>`;

		const pdfBuffer = await createPdfWithEmbeddedXml(largeXml);
		const result = await extractEmbeddedXmlWithPdfLib(pdfBuffer);

		expect(result).toBeDefined();
		expect(result).toContain('<?xml version="1.0"');
		expect(result).toContain('<items>');
		expect(result).toContain('Item 999');
		expect(result?.length).toBeGreaterThan(10000);
	});
});
