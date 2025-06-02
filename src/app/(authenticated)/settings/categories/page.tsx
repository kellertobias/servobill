'use client';

import React, { useState } from 'react';

import { PageContent } from '@/components/page';
import { useLoadData } from '@/hooks/load-data';
import { API, gql } from '@/api/index';
import { Input } from '@/components/input';
import SelectInput from '@/components/select-input';
import { Button } from '@/components/button';
import { SettingsBlock } from '@/components/settings-block';
import { doToast } from '@/components/toast';

import { ExpenseCategoryType } from '@/common/gql/graphql';

/**
 * Generates a random color in hex format.
 */
function randomColor() {
	return `#${Math.floor(Math.random() * 0xffffff)
		.toString(16)
		.padStart(6, '0')}`;
}

/**
 * Main page for managing categories in settings.
 */
export default function CategoriesSettingsPage() {
	// Load categories from settings
	const { data, setData, reload } = useLoadData(async () => {
		const res = await API.query({
			query: gql(`
        query GetSettingsCategoriesForSettingsPage {
          settings { categories { id name color isDefault reference sumForTaxSoftware description } }
        }
      `),
		});
		// Normalize categories to ensure no nulls for fields used in UI
		return (res.settings.categories || []).map((cat) => ({
			...cat,
			color: cat.color ?? '#cccccc',
			isDefault: cat.isDefault ?? false,
			sumForTaxSoftware: cat.sumForTaxSoftware ?? false,
			description: cat.description ?? '',
		}));
	});

	// Local state for new category form
	const [newCategory, setNewCategory] = useState<Partial<ExpenseCategoryType>>({
		name: '',
		color: randomColor(),
		isDefault: false,
		sumForTaxSoftware: false,
		description: '',
	});

	// Add a new category to the list
	const handleAddCategory = () => {
		if (!newCategory.name?.trim()) {
			return;
		}
		setData((current) => [
			...((current ?? []).filter(Boolean) as ExpenseCategoryType[]).map(
				(cat) => ({
					...cat,
					color: cat.color ?? '#cccccc',
					isDefault: cat.isDefault ?? false,
					sumForTaxSoftware: cat.sumForTaxSoftware ?? false,
					description: cat.description ?? '',
				}),
			),
			{
				...newCategory,
				name: newCategory.name || '',
				color: newCategory.color ?? '#cccccc',
				isDefault: newCategory.isDefault ?? false,
				sumForTaxSoftware: newCategory.sumForTaxSoftware ?? false,
				description: newCategory.description ?? '',
				reference: newCategory.reference ?? '',
				id: Math.random().toString(36).slice(2),
			},
		]);

		setNewCategory({
			name: '',
			color: randomColor(),
			isDefault: false,
			sumForTaxSoftware: false,
			description: '',
		});
	};

	// Update a category in the list
	const handleUpdateCategory = (
		id: string,
		updated: Partial<ExpenseCategoryType>,
	) => {
		setData((current) =>
			((current ?? []) as ExpenseCategoryType[]).map((cat) =>
				cat.id === id
					? {
							...cat,
							...updated,
							color: updated.color ?? cat.color ?? '#cccccc',
							isDefault: updated.isDefault ?? cat.isDefault ?? false,
							sumForTaxSoftware:
								updated.sumForTaxSoftware ?? cat.sumForTaxSoftware ?? false,
							description: updated.description ?? cat.description ?? '',
						}
					: {
							...cat,
							color: cat.color ?? '#cccccc',
							isDefault: cat.isDefault ?? false,
							sumForTaxSoftware: cat.sumForTaxSoftware ?? false,
							description: cat.description ?? '',
						},
			),
		);
	};

	// Delete a category from the list
	const handleDeleteCategory = (id: string) => {
		setData((current) => (current ?? []).filter((cat) => cat && cat.id !== id));
	};

	// Save categories to backend
	const handleSave = async () => {
		doToast({
			promise: (async () => {
				await API.query({
					query: gql(`
            mutation UpdateSettingsCategoriesForSettingsPage($settings: SettingsInput!) {
              updateSettings(data: $settings) { categories { id name color isDefault reference sumForTaxSoftware description } }
            }
          `),
					variables: { settings: { categories: data } },
				});
				reload();
			})(),
			loading: 'Saving categories',
			success: 'Categories saved',
			error: 'Failed to save categories',
		});
	};

	return (
		<PageContent
			title="Settings - Categories"
			noPadding
			contentClassName="overflow-hidden pt-6"
		>
			<div className="space-y-12 p-6 pt-0 divide-y divide-gray-900/10">
				<SettingsBlock
					title="Manage Categories"
					subtitle={
						<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
							Here you can add, edit, or remove categories for expenses and
							products. Categories help you organize and report your data.
						</div>
					}
				>
					{/* List of categories */}
					<div className="space-y-8">
						{Array.isArray(data) && data.length > 0 ? (
							data.map((cat: ExpenseCategoryType) => (
								<div
									key={cat.id}
									className="border-b pb-6 last:border-b-0 last:pb-0 space-y-2"
								>
									{/* Row 1: Name (10/12) and Color (2/12) */}
									<div className="flex w-full gap-2">
										<div className="w-10/12">
											<Input
												label="Name"
												value={cat.name}
												onChange={(name) =>
													handleUpdateCategory(cat.id, { name })
												}
												className="w-full"
											/>
										</div>
										<div className="w-2/12 flex items-end">
											<Input
												label="Color"
												value={cat.color ?? '#cccccc'}
												type="color"
												onChange={(color) =>
													handleUpdateCategory(cat.id, { color })
												}
												className="w-full"
											/>
										</div>
									</div>

									{/* Row 2: Color, Sum in Exports, Default, Reference */}
									<div className="flex w-full gap-2">
										<div className="w-4/12">
											<SelectInput
												label="Sum in Exports"
												value={cat.sumForTaxSoftware ? 'yes' : 'no'}
												onChange={(val) =>
													handleUpdateCategory(cat.id, {
														sumForTaxSoftware: val === 'yes',
													})
												}
												options={[
													{ value: 'yes', label: 'Yes' },
													{ value: 'no', label: 'No' },
												]}
												className="w-full"
											/>
										</div>
										<div className="w-4/12">
											<SelectInput
												label="Default"
												value={cat.isDefault ? 'yes' : 'no'}
												onChange={(val) =>
													handleUpdateCategory(cat.id, {
														isDefault: val === 'yes',
													})
												}
												options={[
													{ value: 'yes', label: 'Yes' },
													{ value: 'no', label: 'No' },
												]}
												className="w-full"
											/>
										</div>
										<div className="w-4/12">
											<Input
												label="Reference"
												value={cat.reference ?? ''}
												onChange={(reference) =>
													handleUpdateCategory(cat.id, { reference })
												}
												className="w-full"
											/>
										</div>
									</div>

									{/* Row 3: Description textarea */}
									<div className="w-full">
										{/* Use textarea for multiline description */}
										<Input
											label="Description"
											value={cat.description ?? ''}
											onChange={(description) =>
												handleUpdateCategory(cat.id, { description })
											}
											as="textarea"
											textarea
											className="w-full"
										/>
									</div>
									<div className="flex w-full justify-end">
										<Button danger onClick={() => handleDeleteCategory(cat.id)}>
											Delete
										</Button>
									</div>
								</div>
							))
						) : (
							<div className="text-xs text-gray-500">No categories yet.</div>
						)}
					</div>

					{/* Add new category - same layout as above */}
					<div className="mt-12 border-t pt-6 space-y-2">
						{/* Row 1: Name and Color */}
						<div className="flex w-full gap-2">
							<div className="w-10/12">
								<Input
									label="Name"
									value={newCategory.name}
									onChange={(name) => setNewCategory((c) => ({ ...c, name }))}
									className="w-full"
								/>
							</div>
							<div className="w-2/12 flex items-end">
								<Input
									label="Color"
									value={newCategory.color}
									type="color"
									onChange={(color) => setNewCategory((c) => ({ ...c, color }))}
									className="w-full"
								/>
							</div>
						</div>
						{/* Row 2: Color, Sum in Exports, Default, Reference */}
						<div className="flex w-full gap-2">
							<div className="w-4/12">
								<SelectInput
									label="Sum in Exports"
									value={newCategory.sumForTaxSoftware ? 'yes' : 'no'}
									onChange={(val) =>
										setNewCategory((c) => ({
											...c,
											sumForTaxSoftware: val === 'yes',
										}))
									}
									options={[
										{ value: 'yes', label: 'Yes' },
										{ value: 'no', label: 'No' },
									]}
									className="w-full"
								/>
							</div>
							<div className="w-4/12">
								<SelectInput
									label="Default"
									value={newCategory.isDefault ? 'yes' : 'no'}
									onChange={(val) =>
										setNewCategory((c) => ({ ...c, isDefault: val === 'yes' }))
									}
									options={[
										{ value: 'yes', label: 'Yes' },
										{ value: 'no', label: 'No' },
									]}
									className="w-full"
								/>
							</div>
							<div className="w-4/12">
								<Input
									label="Reference"
									value={newCategory.reference ?? ''}
									onChange={(reference) =>
										setNewCategory((c) => ({ ...c, reference }))
									}
									className="w-full"
								/>
							</div>
						</div>
						{/* Row 3: Description textarea */}
						<div className="w-full">
							{/* Use textarea for multiline description */}
							<Input
								label="Description"
								value={newCategory.description}
								onChange={(description) =>
									setNewCategory((c) => ({ ...c, description }))
								}
								as="textarea"
								textarea
								className="w-full"
							/>
						</div>
						<div className="flex w-full justify-end">
							<Button primary onClick={handleAddCategory}>
								Add
							</Button>
						</div>
					</div>
				</SettingsBlock>
			</div>

			<div className="flex justify-start px-6 pb-6 pt-6">
				<Button primary onClick={handleSave}>
					Save Categories
				</Button>
			</div>
		</PageContent>
	);
}
