export class DeferredPromise<T = void> {
	public resolve: (value: T) => void = () => {
		throw new Error('DeferredPromise not initialized yet');
	};
	public reject: (reason?: unknown) => void = () => {
		throw new Error('DeferredPromise not initialized yet');
	};

	public readonly promise: Promise<T>;

	constructor() {
		this.promise = new Promise<T>((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}
}
