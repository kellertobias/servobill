import { redirect } from 'next/navigation';

export default function InventoryRootRedirect() {
	// Redirect to /inventory/type by default
	redirect('/inventory/type');
	return null;
}
