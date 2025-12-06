import { Button } from '@/components/button';

export const InvoiceActions = ({
  actions,
  hasChanges,
}: {
  actions: {
    active?: boolean;
    name: string;
    onClick: () => void;
    isPrimary?: boolean;
    confirm?: {
      title: string;
      description: string;
      confirmLabel: string;
      cancelLabel: string;
    }[];
  }[];
  hasChanges?: boolean;
}) => {
  return (
    <div className="mt-6 mb-6 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 w-full gap-2 px-6">
      {actions.map(
        (action) =>
          action.active !== false && (
            <Button
              disabled={hasChanges}
              secondary={!action.isPrimary}
              primary={action.isPrimary}
              key={action.name}
              onClick={action.onClick}
            >
              {action.name}
            </Button>
          )
      )}
    </div>
  );
};
