import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export function NotFound({
  title = 'Not Found',
  subtitle = 'The requested resource could not be found.',
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="my-6 mb-16">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
      </div>
      <div className="mt-3 text-center sm:mt-5">
        <h3 className="text-xl font-semibold leading-6 text-gray-900">{title}</h3>
        <div className="mt-2">
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
