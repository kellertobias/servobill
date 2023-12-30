const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export class CustomJson {
	public static toJson(data: unknown): string {
		return JSON.stringify(data);
	}

	public static fromJson<T>(data: string | undefined): T {
		if (data === undefined) {
			return undefined as unknown as T;
		}
		return JSON.parse(data, (key, value) => {
			if (typeof value === 'string' && isoDateRegex.test(value)) {
				return new Date(value);
			}
			return value;
		});
	}
}
