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
    'require-authorized-decorator': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce @Authorized() decorator on public methods in resolver files',
          category: 'Security',
          recommended: true,
        },
        fixable: null,
        schema: [],
      },
      create(context) {
        // Check if current file is a resolver file
        const filename = context.getFilename();
        const isResolverFile = filename.endsWith('.resolver.ts');

        if (!isResolverFile) {
          return {};
        }

        /**
         * Checks if a method has the @Authorized() decorator or @AllowUnauthorized() decorator
         * @param {Object} node - The method node to check
         * @returns {boolean} - True if the method has @Authorized() or @AllowUnauthorized() decorator
         */
        function hasAuthorizedDecorator(node) {
          if (!node.decorators || node.decorators.length === 0) {
            return false;
          }

          return node.decorators.some(decorator => {
            // Check for @Authorized() - both with and without arguments
            if (decorator.expression.type === 'CallExpression') {
              const name = decorator.expression.callee.name;
              return name === 'Authorized' || name === 'AllowUnauthorized';
            }
            if (decorator.expression.type === 'Identifier') {
              const name = decorator.expression.name;
              return name === 'Authorized' || name === 'AllowUnauthorized';
            }
            return false;
          });
        }

        /**
         * Checks if a method is public (no access modifier or explicitly public)
         * @param {Object} node - The method node to check
         * @returns {boolean} - True if the method is public
         */
        function isPublicMethod(node) {
          // If no access modifier is specified, it's public by default
          if (!node.accessibility) {
            return true;
          }
          // Explicitly public methods
          return node.accessibility === 'public';
        }

        /**
         * Checks if a method should be excluded from the @Authorized requirement
         * @param {Object} node - The method node to check
         * @returns {boolean} - True if the method should be excluded
         */
        function shouldExcludeMethod(node) {
          // Exclude private and protected methods
          if (node.accessibility === 'private' || node.accessibility === 'protected') {
            return true;
          }

          // Exclude constructor methods
          if (node.kind === 'constructor') {
            return true;
          }

          // Exclude getter and setter methods
          if (node.kind === 'get' || node.kind === 'set') {
            return true;
          }

          // Exclude methods that start with underscore (convention for private methods)
          if (node.key && node.key.name && node.key.name.startsWith('_')) {
            return true;
          }

          return false;
        }

        return {
          MethodDefinition(node) {
            // Only check public methods that should not be excluded
            if (isPublicMethod(node) && !shouldExcludeMethod(node)) {
              if (!hasAuthorizedDecorator(node)) {
                context.report({
                  node,
                  message: `Public method '${node.key.name}' must have @Authorized() or @AllowUnauthorized() decorator for security`,
                });
              }
            }
          },
        };
      },
    },
  },
}; 