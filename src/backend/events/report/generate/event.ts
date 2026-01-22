export interface ReportGenerateEvent {
	start: string;
	end: string;
	format: 'simple' | 'categorized';
	recipientEmail: string;
}
