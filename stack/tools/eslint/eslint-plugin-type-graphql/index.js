module.exports = {
  rules: {
    'enforce-type-declarations': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce type declarations in TypeGraphQL decorators',
          category: 'Best Practices',
          recommended: true,
        },
        fixable: null,
        schema: [],
      },
      create(context) {
        function isTypeDefinition(node) {
          // Handle direct arrow functions
          if (node && node.type === 'ArrowFunctionExpression') {
            return true;
          }
          
          // Handle call expressions that contain arrow functions like: (() => Type)
          if (node && node.type === 'CallExpression') {
            const callee = node.callee;
            return callee && callee.type === 'ArrowFunctionExpression';
          }

          return false;
        }

        return {
          Decorator(node) {
            if (node.expression.type === 'CallExpression') {
              const decoratorName = node.expression.callee.name;
              const args = node.expression.arguments;

              if (decoratorName === 'Field') {
                // For @Field, type must be first argument
                if (args.length === 0 || !isTypeDefinition(args[0])) {
                  context.report({
                    node,
                    message: '@Field decorator must have a type definition as first argument',
                  });
                }
              } else if (decoratorName === 'Arg') {
                // For @Arg, type must be second argument
                if (args.length < 2 || !isTypeDefinition(args[1])) {
                  context.report({
                    node,
                    message: '@Arg decorator must have a type definition as second argument',
                  });
                }
              }
            }
          },
        };
      },
    },
  },
}; 