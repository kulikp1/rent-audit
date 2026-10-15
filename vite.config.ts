import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import pkg from './package.json' with { type: 'json' };

function printProjectInfo(): Plugin {
	return {
		name: 'print-project-info',
		configureServer(server) {
			server.httpServer?.once('listening', () => {
				const address = server.httpServer?.address();
				const port = typeof address === 'object' && address ? address.port : server.config.server.port;
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
	// Hide Vite's own banner and info logs; printProjectInfo prints what we need
	logLevel: 'warn',
	plugins: [
		printProjectInfo(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	]
});
