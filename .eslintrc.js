module.exports = {
  env: {
    node: true,
    mocha: true,
    browser: true,
  },
  plugins: ["@typescript-eslint", "import", "prettier", "type-graphql"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@next/next/recommended",
    "plugin:promise/recommended",
    "plugin:unicorn/recommended",
    "prettier",
  ],
  parserOptions: {
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname,
  },
  rules: {
    "no-console": "warn",
    "arrow-body-style": "off",
    "consistent-return": "off",
    curly: "error",
    "import/extensions": "off",
    "@next/next/no-img-element": "off",
    "unicorn/no-await-expression-member": "warn",
    "type-graphql/enforce-type-declarations": "error",
    "type-graphql/require-authorized-decorator": "error",
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: [
          "**/*.*spec.ts",
          "**/*.*spec.tsx",
          "**/*.stories.tsx",
          "**/*.stories.ts",
          "**/*.spec.tsx",
          "**/*.spec.ts",
          "stack/**/*.ts",
          "sst.config.ts",
          "codegen.ts"
        ],
      },
    ],
    "import/order": [
      "error",
      {
        "newlines-between": "always",
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        pathGroups: [
          {
            pattern: "**/polyfills",
            group: "builtin",
            position: "before",
          },
          {
            pattern: "next/**",
            group: "builtin",
          },
          {
            pattern: "react**",
            group: "builtin",
          },
          {
            pattern: "clsx",
            group: "builtin",
          },
          {
            pattern: "@/components/**",
            group: "internal",
          },
          {
            pattern: "@/config",
            group: "internal",
          },
          {
            pattern: "@/app/**",
            group: "internal",
            position: "after",
          },
          {
            pattern: "@/api/**",
            group: "internal",
          },
          {
            pattern: "@/hooks/**",
            group: "internal",
          },
        ],
        pathGroupsExcludedImportTypes: ["builtin"],
      },
    ],
    "import/prefer-default-export": "off",
    "unicorn/prefer-node-protocol": "off",
    "no-restricted-imports": "error",
    "no-underscore-dangle": [
      "error",
      {
        allow: ["_id"],
      },
    ],
    "no-plusplus": [
      "error",
      {
        allowForLoopAfterthoughts: true,
      },
    ],
    "no-undef": ["error"],
    "nonblock-statement-body-position": ["error", "below"],
    "react/prop-types": "off",
    "react/jsx-props-no-spreading": "off",
    "unicorn/no-array-for-each": "off",
    "unicorn/no-static-only-class": "off",
    "unicorn/better-regex": "warn",
    "unicorn/no-array-reduce": "off",
    "unicorn/no-null": "off",
    "unicorn/prevent-abbreviations": "off",
    "unicorn/prefer-dom-node-remove": "off",
    "unicorn/numeric-separators-style": "off",
    "unicorn/prefer-export-from": "warn",
    "unicorn/consistent-destructuring": "off",
    "unicorn/prefer-spread": "warn",
    "@typescript-eslint/no-implied-eval": "warn",
    "@typescript-eslint/no-unused-expressions": ["error", {}],
    "@typescript-eslint/no-unused-vars": "error",
    "class-methods-use-this": "off",
    "jsx-a11y/click-events-have-key-events": "off",
    "jsx-a11y/no-noninteractive-element-interactions": "off",
    "jsx-a11y/no-static-element-interactions": "off",
    "jsx-a11y/interactive-supports-focus": "off",
  },
  overrides: [
    {
      files: [
        "**/*.e2e.ts",
        "**/*.spec.tsx",
        "**/*.spec.ts",
        "**/*.stories.tsx",
        "**/*.*-spec.ts",
        "**/*.*-spec.tsx",
      ],
      env: {
      },
      plugins: ["vitest"],
      rules: {
        "no-restricted-imports": "off",
        "import/no-extraneous-dependencies": "off",
        "unicorn/no-array-callback-reference": "off",
        "import/no-useless-path-segments": "warn",
      },
    },
  ],
  globals: {
    NodeJS: true,
    JSX: true,
  },
};
