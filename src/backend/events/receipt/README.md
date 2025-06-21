# Receipt Event Handler

This event handler processes receipts and invoices that are uploaded or received via email. It uses LLM (Large Language Model) services to extract expense information from receipts and images.

## Overview

The receipt event handler consists of several components:

1. **ReceiptEvent** - Event definition with attachment location and email text
2. **ReceiptClassificationService** - Determines if a receipt is a digital invoice or requires extraction
3. **ReceiptExtractionService** - Uses LLM to extract expense information from receipts
4. **HandlerExecution** - Main orchestrator that coordinates the classification and extraction process

## Event Structure

```typescript
interface ReceiptEvent {
  id: string;                    // Unique event ID
  attachmentLocation?: string;   // File location (format: "bucket:key" or just "key")
  emailText?: string;           // Optional email text for context
}
```

## Processing Flow

1. **Classification**: The handler first classifies the receipt type:
   - **Digital Invoice**: Contains payment links, invoice numbers, etc. (currently throws NotImplementedError)
   - **Extraction**: Regular receipt requiring LLM-based extraction

2. **Extraction**: For extraction cases, the handler:
   - Loads available expense categories from settings
   - Retrieves the attachment file from storage
   - Sends the file and context to an LLM service
   - Parses the LLM response to extract structured expense data
   - Saves the extracted expenses to the database

## LLM Service

The handler uses a generic LLM service that supports:
- **OpenAI**: GPT-4o and other OpenAI models
- **Anthropic**: Claude models
- **Local**: OpenAPI-compatible local LLMs

### Configuration

Set the following environment variables:
- `LLM_PROVIDER`: `openai`, `anthropic`, or `local`
- `LLM_API_KEY`: API key for the selected provider
- `LLM_BASE_URL`: Base URL (for local LLMs)
- `LLM_MODEL`: Model name (e.g., `gpt-4o`, `claude-3-opus-20240229`)

## Extracted Data Structure

The LLM extracts expense information in the following format:

```json
[
  {
    "name": "Item name",
    "expendedCents": 1000,
    "taxCents": 190,
    "expendedAt": "2024-01-15T10:30:00Z",
    "description": "Optional description",
    "categoryId": "category-id-if-applicable"
  }
]
```

## Supported File Types

- **PDF**: Receipt and invoice PDFs
- **Images**: JPEG, PNG, GIF, WebP formats

## Usage

The event handler is automatically registered and can be triggered by sending a "receipt" event to the event bus:

```typescript
// Example event
{
  "detail-type": "receipt",
  "detail": {
    "id": "receipt-123",
    "attachmentLocation": "receipts/receipt-123.pdf",
    "emailText": "Here is your receipt from the store"
  }
}
```

## Error Handling

- **Digital Invoice Processing**: Currently throws "Digital invoice processing not implemented yet"
- **LLM Errors**: Logged and re-thrown for proper error handling
- **File Access Errors**: Handled gracefully with appropriate error messages
- **Parsing Errors**: LLM response parsing errors are logged and re-thrown

## Future Enhancements

1. **Digital Invoice Processing**: Implement parsing of structured digital invoices
2. **Enhanced Classification**: Use LLM for more accurate receipt classification
3. **Batch Processing**: Support for processing multiple receipts in a single event
4. **Validation**: Add validation for extracted expense data
5. **Retry Logic**: Implement retry mechanisms for LLM API calls 