export default defineConfig([
  {
    plugins: {
      prettier: prettierPlugin,
    },
    extends: compat.extends("next/core-web-vitals", "next/typescript", "prettier"),

    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": "warn", // Change from error to warning
      "prefer-const": "warn", // Change from error to warning
      "react/no-unescaped-entities": "warn", // Change from error to warning
      
      "prettier/prettier": [
        "warn", // Change from error to warning
        {
          endOfLine: "auto",
        },
      ],
    },
  },
]);