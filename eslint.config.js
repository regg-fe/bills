import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        // Scripts Node planos (.mjs): tsc no los chequea y tseslint desactiva
        // no-undef solo para TS, así que los globals van explícitos.
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            globals: {
                URL: 'readonly',
                URLSearchParams: 'readonly',
                process: 'readonly',
                console: 'readonly',
            },
        },
    },
    {
        ignores: ['dist/', 'node_modules/'],
    }
);