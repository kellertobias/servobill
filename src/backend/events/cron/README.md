# Cron Event Handler

This event handler is responsible for polling the time-based jobs repository for jobs that are due to be executed, and dispatching the corresponding events on the event bus. It is intended to be triggered on a schedule (e.g., via a cron job or scheduled Lambda).

## Overview

The cron event handler consists of several components:

1. **CronEvent** - Event definition for triggering the cron handler
2. **HandlerExecution** - Main orchestrator that fetches due jobs and dispatches their events

## Event Structure

```typescript
interface CronEvent {
  id: string;                    // Unique event ID
  triggeredAt: string;           // ISO timestamp when the cron was triggered
}
```

## Processing Flow

1. **Fetch Due Jobs**: The handler queries the time-based jobs repository for jobs whose `runAfter` timestamp is less than or equal to the current time.
2. **Dispatch Events**: For each due job, the handler sends the corresponding event (using the job's `eventType` and `eventPayload`) on the event bus.
3. **Cleanup**: After dispatching, the job is deleted from the repository to prevent re-execution.

## Usage

The event handler is automatically registered and can be triggered by sending a "cron" event to the event bus:

```typescript
// Example event
{
  "detail-type": "cron",
  "detail": {
    "id": "cron-20240607-001",
    "triggeredAt": "2024-06-07T12:00:00Z"
  }
}
```

## Error Handling

- **Job Fetching Errors**: Logged and re-thrown for proper error handling
- **Event Dispatch Errors**: Logged and do not prevent other jobs from being processed
- **Job Deletion Errors**: Logged and do not prevent other jobs from being processed

## Future Enhancements

1. **Batch Size Limiting**: Support for limiting the number of jobs processed per invocation
2. **Retry Logic**: Implement retry mechanisms for event dispatch and job deletion
3. **Metrics**: Add metrics for jobs processed, events dispatched, and errors encountered 