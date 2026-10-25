import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { type Plugin } from 'vite';
import pkg from './package.json' with { type: 'json' };

function printProjectInfo(): Plugin {
	return {
		name: 'print-project-info',
		configureServer(server) {
			server.httpServer?.once('listening', () => {
				const address = server.httpServer?.address();
				const port =
					typeof address === 'object' && address ? address.port : server.config.server.port;
				console.log(`\n  ${pkg.name}`);
				console.log(`  ➜ Local: \x1b[34mhttp://localhost:${port}/\x1b[0m\n`);
			});

			if (!process.stdin.isTTY) return;
			const onData = (data: Buffer) => {
				if (data.toString().trim() !== '') return;
				process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
				void server.restart();
			};
			process.stdin.on('data', onData);
			server.httpServer?.once('close', () => process.stdin.off('data', onData));
		}
	};
}

export default defineConfig({
	logLevel: 'warn',
	plugins: [
		tailwindcss(),
		printProjectInfo(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': [
						'self',
						'data:',
						'blob:',
						'https://api.cloudinary.com',
						'https://res.cloudinary.com',
						'https://lh3.googleusercontent.com'
					],
					'font-src': ['self', 'data:'],
					'connect-src': ['self', 'https://api.cloudinary.com'],
					'form-action': ['self'],
					'frame-ancestors': ['none'],
					'base-uri': ['self'],
					'object-src': ['none']
				}
			}
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			strategy: ['cookie', 'preferredLanguage', 'baseLocale']
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
