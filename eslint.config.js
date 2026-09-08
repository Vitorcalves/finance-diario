const {
    defineConfig,
} = require("eslint/config");

const tsParser = require("@typescript-eslint/parser");

const {
    fixupConfigRules,
} = require("@eslint/compat");

const reactNative = require("eslint-plugin-react-native");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2021,
        sourceType: "module",

        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },

            // Os testes ficam fora do tsconfig do app (rodam no Node, com o
            // alias de `expo-sqlite`): sem o segundo projeto o parser nao acha
            // esses arquivos e nao consegue aplicar as regras com tipo.
            project: ["./tsconfig.json", "./tsconfig.test.json"],
        },
    },

    settings: {
        react: {
            version: "detect",
        },
    },

    extends: fixupConfigRules(compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended",
        "plugin:prettier/recommended",
    )),

    plugins: {
        "react-native": reactNative,
    },

    rules: {
        "react-native/no-unused-styles": "warn",
        "react-native/no-inline-styles": "warn",

        "@typescript-eslint/no-unused-vars": ["warn", {
            argsIgnorePattern: "^_",
        }],

        "@typescript-eslint/explicit-function-return-type": "warn",
        "@typescript-eslint/no-unsafe-assignment": "warn",
        "@typescript-eslint/no-unsafe-member-access": "warn",
    },
}, {
    files: ["**/*.test.ts", "tests/**/*.ts"],

    rules: {
        // `test()` e `describe()` do node:test devolvem Promise. Aguardar cada
        // chamada nao muda o comportamento e encheria os arquivos de `void`.
        "@typescript-eslint/no-floating-promises": "off",

        // O substituto de `expo-sqlite` precisa ser async para casar com a
        // interface real, mesmo com `node:sqlite` sendo sincrono.
        "@typescript-eslint/require-await": "off",
    },
}]);
