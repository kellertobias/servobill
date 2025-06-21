import { ExpenseCategory } from '@/backend/entities/settings.entity';

export default (rawEmailText: string, categories: ExpenseCategory[]) => {
	return `
    <context>
	You are a bookkeeper. You are given an incoming invoice and need
    to extract the expenses we need to book.

    Analyze the provided email, text, or attachments and extract the expenses
    we need to create in our accounting system.

    You will be given a list of categories you can assign the extracted expenses to.

    Make sure to extract all expenses from the source and create sensible 
    names for the expenses. If multiple very similar expenses are present,
    create a single expense with a name that describes the group of expenses.
    (e.g. "Office Supplies" if there are multiple office supplies and all of them belong to the same category)

    If you are not sure about the category, you can leave it empty.
    </context>

    <output-format>
    JSON array of expenses. Each item has the following properties:
    - name: string # an easy to understand name for the expense
    - expendedCents: number # the price in cents for the expense item. including tax
    - taxCents: number # the tax amount in cents for the expense item
    - expendedAt: string # the date the expense was spent, usually the date of the receipt/ invoice. If not specified, leave empty.
    - description: string # this will show up on the tax report
    - notes: string # these are internal notes for you to remember the expense
    - categoryId: string # the id of the category you want to assign the expense to. If you are not sure, leave empty.

    Please provide only the JSON array, no additional text.
    </output-format>

    <guidelines>
    - Convert all amounts to cents (e.g., $10.00 = 1000 cents)
    - Use ISO 8601 format for dates
    - If no specific date is found, leave it empty
    - Only include categoryId if you can confidently match an item to a category
    - Extract tax amounts separately when possible
    - If multiple items are present, list each separately and group them to similar items.
    </guidelines>

    <categories>
    ${JSON.stringify(
			categories.map((c) => ({
				id: c.id,
				name: c.name,
				description: c.description,
				reference: c.reference,
			})),
		)}
    </categories>

    ${
			rawEmailText
				? `
    <email-context>
    ${rawEmailText}
    </email-context>	
    `
				: ''
		}
	`;
};
