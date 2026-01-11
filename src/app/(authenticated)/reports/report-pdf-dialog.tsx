import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { Button } from '@/components/button';

interface ReportPdfDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onGenerate: (format: 'simple' | 'categorized') => void;
}

export default function ReportPdfDialog({
	isOpen,
	onClose,
	onGenerate,
}: ReportPdfDialogProps) {
	const [format, setFormat] = useState<'simple' | 'categorized'>('simple');

	const handleGenerate = () => {
		onGenerate(format);
		onClose();
	};

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog as="div" className="relative z-50" onClose={onClose}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
				</Transition.Child>

				<div className="fixed inset-0 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4 text-center">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
								<Dialog.Title
									as="h3"
									className="text-lg font-medium leading-6 text-gray-900"
								>
									Generate PDF Report
								</Dialog.Title>
								<div className="mt-2">
									<p className="text-sm text-gray-500">
										Please select the format for your PDF report.
									</p>

									<div className="mt-4 space-y-4">
										<div className="flex items-center">
											<input
												id="simple"
												name="format"
												type="radio"
												checked={format === 'simple'}
												onChange={() => setFormat('simple')}
												className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
											/>
											<label
												htmlFor="simple"
												className="ml-3 block text-sm font-medium leading-6 text-gray-900"
											>
												Simple
												<span className="block text-xs text-gray-500 font-normal">
													List of all incomes and expenses ordered by date.
												</span>
											</label>
										</div>
										<div className="flex items-center">
											<input
												id="categorized"
												name="format"
												type="radio"
												checked={format === 'categorized'}
												onChange={() => setFormat('categorized')}
												className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
											/>
											<label
												htmlFor="categorized"
												className="ml-3 block text-sm font-medium leading-6 text-gray-900"
											>
												Categorized
												<span className="block text-xs text-gray-500 font-normal">
													Grouped by category with summaries.
												</span>
											</label>
										</div>
									</div>
								</div>

								<div className="mt-6 flex flex-row-reverse gap-3">
									<Button onClick={handleGenerate} primary>
										Generate PDF
									</Button>
									<Button onClick={onClose} secondary>
										Cancel
									</Button>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
}
