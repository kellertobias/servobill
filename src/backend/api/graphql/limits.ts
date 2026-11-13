import {
	type ASTVisitor,
	type FragmentDefinitionNode,
	GraphQLError,
	Kind,
	type SelectionSetNode,
	type ValidationContext,
} from 'graphql';

/**
 * Limits for incoming GraphQL documents. The frontend's largest query is
 * 4 levels deep with about 50 fields, so these leave plenty of headroom
 * while rejecting deeply nested or alias-amplified requests.
 */
export const QUERY_LIMITS = {
	maxDepth: 10,
	maxFields: 1000,
	maxAliases: 50,
};

type Counts = { depth: number; fields: number; aliases: number };

const measure = (
	selectionSet: SelectionSetNode | undefined,
	fragments: Record<string, FragmentDefinitionNode>,
	visited: Set<string>,
): Counts => {
	const result: Counts = { depth: 0, fields: 0, aliases: 0 };
	if (!selectionSet) {
		return result;
	}
	for (const selection of selectionSet.selections) {
		let child: Counts;
		if (selection.kind === Kind.FIELD) {
			child = measure(selection.selectionSet, fragments, visited);
			child.depth += 1;
			child.fields += 1;
			if (selection.alias) {
				child.aliases += 1;
			}
		} else if (selection.kind === Kind.INLINE_FRAGMENT) {
			child = measure(selection.selectionSet, fragments, visited);
		} else {
			const name = selection.name.value;
			// Fragment cycles are rejected by the standard rules; this only
			// guards against measuring the same cycle forever.
			if (visited.has(name) || !fragments[name]) {
				continue;
			}
			child = measure(
				fragments[name].selectionSet,
				fragments,
				new Set([...visited, name]),
			);
		}
		result.depth = Math.max(result.depth, child.depth);
		result.fields += child.fields;
		result.aliases += child.aliases;
	}
	return result;
};

/** Measures depth, field count and aliases of every operation in a document. */
export const measureOperations = (
	context: ValidationContext,
): { name: string; counts: Counts }[] => {
	const document = context.getDocument();
	const fragments: Record<string, FragmentDefinitionNode> = {};
	for (const definition of document.definitions) {
		if (definition.kind === Kind.FRAGMENT_DEFINITION) {
			fragments[definition.name.value] = definition;
		}
	}
	return document.definitions.flatMap((definition) =>
		definition.kind === Kind.OPERATION_DEFINITION
			? [
					{
						name: definition.name?.value ?? 'anonymous operation',
						counts: measure(definition.selectionSet, fragments, new Set()),
					},
				]
			: [],
	);
};

/** Validation rule that rejects documents exceeding QUERY_LIMITS. */
export const queryLimitsRule =
	(limits = QUERY_LIMITS) =>
	(context: ValidationContext): ASTVisitor => {
		for (const { name, counts } of measureOperations(context)) {
			if (counts.depth > limits.maxDepth) {
				context.reportError(
					new GraphQLError(
						`${name} is nested ${counts.depth} levels deep, the limit is ${limits.maxDepth}.`,
					),
				);
			}
			if (counts.fields > limits.maxFields) {
				context.reportError(
					new GraphQLError(
						`${name} selects ${counts.fields} fields, the limit is ${limits.maxFields}.`,
					),
				);
			}
			if (counts.aliases > limits.maxAliases) {
				context.reportError(
					new GraphQLError(
						`${name} uses ${counts.aliases} aliases, the limit is ${limits.maxAliases}.`,
					),
				);
			}
		}
		return {};
	};
