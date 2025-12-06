import { isServer } from './graphql-connection';

export const revalidateOnError = async () => {
  if (isServer) {
    const { revalidatePath } = await import('next/cache');
    // Reset Cache to avoid caching errors
    const { headers } = await import('next/headers');

    const headersList = await headers();

    const path = headersList.get('next-url') || '/';

    // eslint-disable-next-line no-console
    console.log(`Request Failed. Invalidating Cache for ${path}`);
    revalidatePath(path);
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log(`Request Failed. Invalidating Cache for ${path} (2))`);
      revalidatePath(path);
    }, 10000);
  }
};

export const handleGqlError = (
  originalError: unknown,
  query: string,
  variables?: Record<string, unknown>
) => {
  const error = originalError as {
    code?: string;
    response?: { status?: number; errors?: { message: string }[] };
    networkError?: {
      statusCode?: number;
      result?: {
        errors?: {
          message: string;
          locations: { line: number; column: number }[];
        }[];
      };
    };
  };

  if (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ECONNRESET' ||
    (error.response?.status || 0) > 500
  ) {
    const errorName = error.response?.status || error.code;
    // eslint-disable-next-line no-console
    console.log(`Could not connect to API Server (${errorName})`);
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(`Could not connect to API Server\n${errorName}`);
  }

  if (error.networkError) {
    const { statusCode, result } = error.networkError;
    let errorMessage = `Error in GraphQL Query.\nServer Returned Code ${statusCode}`;
    result?.errors?.forEach(({ message, locations }) => {
      errorMessage += `\n\n${message}\n  at ${locations
        .map(({ line, column }) => `${line}:${column}`)
        .join(', ')}`;
    });
    errorMessage += `\n\nQuery Was:\n${query}`;
    errorMessage += `\n\nVariables:\n${JSON.stringify(variables)}`;
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(errorMessage);
  }

  if (error.response?.errors) {
    // eslint-disable-next-line no-console
    console.log(JSON.parse(JSON.stringify(error)));

    let errorMessage = `Error in GraphQL Query.\n\n`;

    error.response.errors.forEach(({ message }) => {
      const messageParts = message.split('\n at');
      errorMessage += messageParts.length > 1 ? `${messageParts[0]}\n` : `${message}\n`;
    });

    // eslint-disable-next-line no-console
    console.error(errorMessage);
    // eslint-disable-next-line no-console
    console.log({ query, variables });

    throw new Error(errorMessage);
  }

  throw new Error(`Error in GraphQL Query: ${String(error)}`);
};
