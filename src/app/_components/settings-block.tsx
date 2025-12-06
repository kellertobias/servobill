import type React from 'react';

export function SettingsBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string | React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-10 pb-4 pt-12 first:pt-0 last:pb-0 md:grid-cols-5">
      <div className="md:col-span-2">
        <h2 className="text-base font-semibold leading-7 text-gray-900">{title}</h2>
        <div className="mt-1 text-sm leading-6 text-gray-600">{subtitle}</div>
      </div>

      <div className="grid md:col-span-3 max-w-3xl grid-cols-1 gap-x-6 gap-y-4">{children}</div>
    </div>
  );
}
