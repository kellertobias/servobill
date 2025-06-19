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
    'require-explicit-type-names': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce explicit names for @ObjectType() and @InputType() decorators',
          category: 'Best Practices',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
      },
      create(context) {
        /**
         * Checks if a decorator argument is a valid string literal (explicit name)
         * @param {Object} node - The argument node to check
         * @returns {boolean} - True if the argument is a valid string literal
         */
        function isValidNameArgument(node) {
          return node && node.type === 'Literal' && typeof node.value === 'string' && node.value.trim() !== '';
        }

        /**
         * Gets the class name from the class declaration
         * @param {Object} classNode - The class declaration node
         * @returns {string|null} - The class name or null if not found
         */
        function getClassName(classNode) {
          return classNode && classNode.id && classNode.id.name;
        }

        /**
         * Checks if a class has both ObjectType and InputType decorators
         * @param {Array} decorators - Array of decorator nodes
         * @returns {boolean} - True if both decorators are present
         */
        function hasBothTypeDecorators(decorators) {
          if (!decorators || decorators.length === 0) {
            return false;
          }

          let hasObjectType = false;
          let hasInputType = false;

          decorators.forEach(decorator => {
            if (decorator.expression.type === 'CallExpression') {
              const name = decorator.expression.callee.name;
              if (name === 'ObjectType') hasObjectType = true;
              if (name === 'InputType') hasInputType = true;
            } else if (decorator.expression.type === 'Identifier') {
              const name = decorator.expression.name;
              if (name === 'ObjectType') hasObjectType = true;
              if (name === 'InputType') hasInputType = true;
            }
          });

          return hasObjectType && hasInputType;
        }

        return {
          ClassDeclaration(node) {
            const className = getClassName(node);
            if (!className || !node.decorators) {
              return;
            }

            const hasBothDecorators = hasBothTypeDecorators(node.decorators);

            node.decorators.forEach(decorator => {
              if (decorator.expression.type === 'CallExpression') {
                const decoratorName = decorator.expression.callee.name;
                const args = decorator.expression.arguments;

                if (decoratorName === 'ObjectType' || decoratorName === 'InputType') {
                  if (args.length === 0 || !isValidNameArgument(args[0])) {
                    // Generate the appropriate name
                    let suggestedName = className;
                    if (decoratorName === 'InputType' && hasBothDecorators) {
                      suggestedName = `${className}Input`;
                    }

                    context.report({
                      node: decorator,
                      message: `@${decoratorName}() decorator must have an explicit name as the first argument`,
                      fix(fixer) {
                        // If no arguments, add the name argument inside existing parentheses
                        if (args.length === 0) {
                          // Find the opening parenthesis and insert after it
                          const sourceCode = context.getSourceCode();
                          const callExpression = decorator.expression;
                          const openingParen = sourceCode.getFirstToken(callExpression, token => token.value === '(');
                          return fixer.insertTextAfter(
                            openingParen,
                            `'${suggestedName}'`
                          );
                        }
                        // If first argument exists but is invalid, replace it
                        return fixer.replaceText(
                          args[0],
                          `'${suggestedName}'`
                        );
                      },
                    });
                  }
                }
              }
            });
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