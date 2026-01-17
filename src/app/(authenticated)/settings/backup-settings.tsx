
'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Select } from '@/components/select-input';
import { doToast } from '@/components/toast';
import { Toggle } from '@/components/toggle';

// Enum must match backend
enum BackupFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

const UPDATE_BACKUP_SETTINGS_MUTATION = gql(`
  mutation UpdateBackupSettings($data: UpdateBackupSettingsInput!) {
    updateBackupSettings(data: $data) {
      backup {
        backupEmail
        backupFrequency
        backupEnabled
      }
    }
  }
`);

const GET_SETTINGS_QUERY = gql(`
  query GetBackupSettings {
    settings {
      backup {
        backupEmail
        backupFrequency
        backupEnabled
      }
    }
  }
`);

export function BackupSettings() {
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'backup'],
    queryFn: async () => {
      const res = await API.query(GET_SETTINGS_QUERY);
      return res.settings.backup;
    },
  });

  const { register, handleSubmit, setValue, watch } = useForm<{
    backupEmail: string;
    backupFrequency: BackupFrequency;
  }>({
    defaultValues: {
      backupFrequency: BackupFrequency.WEEKLY,
    },
  });

  useEffect(() => {
    if (data) {
      setEnabled(data.backupEnabled || false);
      setValue('backupEmail', data.backupEmail || '');
      setValue(
        'backupFrequency',
        (data.backupFrequency as BackupFrequency) || BackupFrequency.WEEKLY
      );
    }
  }, [data, setValue]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: {
      backupEmail: string;
      backupFrequency: BackupFrequency;
      backupEnabled: boolean;
    }) => {
      await API.query({
        query: UPDATE_BACKUP_SETTINGS_MUTATION,
        variables: {
          data: formData,
        },
      });
    },
    onSuccess: () => {
      doToast({
        success: 'Backup settings saved!',
      });
    },
    onError: () => {
      doToast({
        error: 'Failed to save backup settings.',
      });
    },
  });

  const onSubmit = (formData: {
    backupEmail: string;
    backupFrequency: BackupFrequency;
  }) => {
    mutate({ ...formData, backupEnabled: enabled });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const frequencyOptions = [
    { value: BackupFrequency.DAILY, label: 'Daily' },
    { value: BackupFrequency.WEEKLY, label: 'Weekly' },
    { value: BackupFrequency.MONTHLY, label: 'Monthly' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
            Automated Backups
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Automatically export and email your data periodically.
          </p>
        </div>
        <Toggle
          checked={enabled}
          onChange={(checked) => {
            setEnabled(checked);
          }}
        />
      </div>

      {enabled && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="backupEmail"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Backup Email
            </label>
            <Input
              {...register('backupEmail', { required: true })}
              placeholder="email@example.com"
              className="mt-1"
            />
          </div>

          <div>
            <label
              htmlFor="backupFrequency"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Frequency
            </label>
            <Select
                value={frequencyOptions.find((o) => o.value === watch('backupFrequency'))}
                onChange={(option) => setValue('backupFrequency', option.value)}
                options={frequencyOptions}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      )}
      {!enabled && (
          <div className="flex justify-end">
            <Button onClick={() => mutate({ backupEmail: watch('backupEmail'), backupFrequency: watch('backupFrequency'), backupEnabled: false })} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
      )}
    </div>
  );
}
