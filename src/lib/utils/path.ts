import { resolve } from '$app/paths';

const resolveAny = resolve as unknown as (path: string) => string;

export function pathTo(path: string): string {
	return resolveAny(path);
}
