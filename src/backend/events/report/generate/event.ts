export interface ReportGenerateEvent {
	start: string;
	end: string;
	format: 'PLAIN' | 'CATEGORIZED';
	recipientEmail: string;
}
