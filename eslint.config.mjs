import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": ["error", {
        "checksVoidReturn": false
      }],
      "@typescript-eslint/consistent-type-imports": ["warn", {
        "prefer": "type-imports",
        "disallowTypeAnnotations": false,
        "fixStyle": "inline-type-imports"
      }],
      "@typescript-eslint/naming-convention": ["warn",
        {
          "selector": "typeAlias",
          "format": ["PascalCase"],
          "custom": {
            "regex": "^T[A-Z]",
            "match": true
          }
        },
        {
          "selector": "enum",
          "format": ["PascalCase"]
        },
        {
          "selector": "enumMember",
          "format": ["PascalCase"]
        }
      ],
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/prefer-as-const": "warn",

      "no-console": ["warn", { 
        "allow": ["warn", "error"] 
      }],
      "no-debugger": "error",
      "no-alert": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-return-await": "off",
      "@typescript-eslint/return-await": ["error", "in-try-catch"],
      "require-await": "warn",
      "no-throw-literal": "error",
      "prefer-promise-reject-errors": "error",

      "eqeqeq": ["error", "always", { "null": "ignore" }],
      "curly": ["error", "multi-line"],
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "warn",
      "prefer-template": "off",
      "object-shorthand": ["warn", "always"],
      "no-useless-concat": "warn",
      "no-useless-return": "warn",
      "no-param-reassign": ["warn", { 
        "props": false 
      }],
      
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": ["error", {
        "functions": false,
        "classes": true,
        "variables": true
      }],
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": ["error", {
        "ignoreTypeValueShadow": true,
        "ignoreFunctionTypeParameterNameValueShadow": true
      }],
      
      "max-len": ["warn", { 
        "code": 120,
        "ignoreComments": true,
        "ignoreStrings": true,
        "ignoreTemplateLiterals": true,
        "ignoreUrls": true,
        "ignoreRegExpLiterals": true
      }],
      "max-lines-per-function": "off",
      "complexity": ["warn", 35],
      
      "no-async-promise-executor": "error",
      "no-promise-executor-return": "warn",
      "@typescript-eslint/promise-function-async": "off",

      "no-warning-comments": ["warn", { 
        "terms": ["FIXME"],
        "location": "start" 
      }],

      "@typescript-eslint/no-empty-function": ["error", {
        "allow": ["arrowFunctions"]
      }],
      "no-empty": ["error", {
        "allowEmptyCatch": true
      }]
    }
  },
  {
    files: ["tests/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "max-lines-per-function": "off",
      "no-console": "off",
      "complexity": "off",
      "@typescript-eslint/no-floating-promises": "off"
    }
  }
];
