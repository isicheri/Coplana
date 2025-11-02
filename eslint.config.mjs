import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	{ ignores: ["**/node_modules/**", "**/.pnpm/**"] },
	...compat.config({
		extends: ["next/core-web-vitals", "next/typescript"],
		rules: {
			'@ts-expect-error': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': 'warn',
			'react/no-unescaped-entities': 'warn'
		}
	})
];

export default eslintConfig;
