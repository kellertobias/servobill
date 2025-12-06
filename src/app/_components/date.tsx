'use client';

import { Popover } from '@headlessui/react';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import React, { useState } from 'react';
import { usePopper } from 'react-popper';
import Datepicker from 'tailwind-datepicker-react';

import { Input } from './input';

dayjs.extend(utc);

const datepickerBasicOptions = {
  autoHide: false,
  todayBtn: true,
  clearBtn: false,
  datepickerClassNames: 'relative top-0 right-0 shadow-2xl pt-0',
  theme: {
    background: '',
    todayBtn: '',
    clearBtn: '',
    icons: '',
    text: 'text-gray-600',
    disabledText: 'text-gray-300',
    input: '',
    inputIcon: '',
    selected: 'bg-blue-600',
  },
  icons: {
    // () => ReactElement | JSX.Element
    prev: () => <ArrowLeftIcon className="w-4 h-4" />,
    next: () => <ArrowRightIcon className="w-4 h-4" />,
  },
  language: 'en',
  weekDays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

export const DateInput: React.FC<{
  label?: string;
  value?: string | Date;
  defaultValue?: string | Date;
  placeholder?: string | Date;
  format?: string;
  displayFormat?: string;
  onChange?: (value: string, name?: string) => void;
  readonly?: boolean;
  reduced?: boolean;
}> = ({
  label,
  placeholder,
  onChange,
  value,
  defaultValue,
  format,
  displayFormat = 'DD.MM.YYYY',
  readonly = false,
  reduced = false,
}) => {
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {});

  const currentDate =
    (typeof value === 'string' ? (value ? dayjs(value, format).toDate() : undefined) : value) ||
    (typeof defaultValue === 'string' ? dayjs(defaultValue, format).toDate() : defaultValue) ||
    new Date();

  const dateRef = React.useRef<Date | null>();

  const [selectedDate, setSelectedDate] = React.useState<Date | null>(currentDate || null);

  React.useEffect(() => {
    const nextDate = value
      ? typeof value === 'string'
        ? dayjs(value, format).toDate()
        : value
      : undefined;
    if (nextDate && nextDate !== selectedDate) {
      setSelectedDate(dayjs(nextDate).toDate());
    }
  }, [value, format, selectedDate]);

  const handleChange = (selectedDate: Date) => {
    setSelectedDate(selectedDate);
    const format = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]';
    const interim = dayjs(selectedDate).format(format);
    onChange?.(dayjs.utc(interim, format).format(format));
  };

  const onHandlePickerClick = React.useMemo(() => {
    return (newValue: Date, close: () => void) => {
      const newValueDecoupled = dayjs(newValue).toDate();
      const isSameMonth =
        dayjs(newValueDecoupled).format('MM.YYYY') === dayjs(dateRef.current).format('MM.YYYY');

      if (isSameMonth) {
        close();
      }
      dateRef.current = newValueDecoupled;
      handleChange(dayjs(newValue).toDate());
    };
  }, [handleChange]);

  return (
    <Popover className="relative" aria-disabled={readonly}>
      {({ open, close }) => (
        <>
          <Popover.Button ref={setReferenceElement} className="w-full text-left">
            {reduced ? (
              <input
                placeholder={
                  placeholder
                    ? typeof placeholder === 'string'
                      ? placeholder
                      : dayjs(placeholder).format(displayFormat ?? format)
                    : undefined
                }
                className={clsx(
                  'w-full m-0 p-0 outline outline-transparent border-none bg-transparent resize-none',
                  {
                    'mb-[7px]': !reduced,
                    'cursor-pointer': reduced,
                  }
                )}
                value={value ? dayjs(selectedDate).format(displayFormat ?? format) : ''}
                onChange={(value) => {
                  if (!value) {
                    onChange?.('');
                  }
                }}
              />
            ) : (
              <Input
                {...{ readonly, label }}
                className={clsx({
                  'ring-blue-500 border-blue-500 ring-2': !readonly && open,
                })}
                value={value ? dayjs(selectedDate).format(displayFormat ?? format) : ''}
                onChange={(value) => {
                  if (!value) {
                    onChange?.('');
                  }
                }}
                placeholder={
                  placeholder
                    ? typeof placeholder === 'string'
                      ? placeholder
                      : dayjs(placeholder).format(displayFormat ?? format)
                    : undefined
                }
              />
            )}
          </Popover.Button>
          {!readonly && open && (
            <Popover.Panel
              className="absolute z-10 my-1 text-gray-300 rounded-md ring-1 ring-gray-200"
              ref={setPopperElement}
              style={styles.popper}
              {...attributes.popper}
            >
              <Datepicker
                options={{
                  ...datepickerBasicOptions,
                  defaultDate: currentDate ? dayjs(currentDate).toDate() : new Date(),
                  disabledDates: [],
                }}
                value={selectedDate ? dayjs(selectedDate).toDate() : undefined}
                onChange={(newValue) => onHandlePickerClick(newValue, close)}
                show={true}
                setShow={() => null}
              >
                {' '}
              </Datepicker>
            </Popover.Panel>
          )}
        </>
      )}
    </Popover>
  );
};
