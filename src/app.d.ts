import type { Role } from '#lib/server/models/user.js';

declare global {
	namespace App {
		interface Locals {
			user: { id: string; role: Role } | null;
		}
	}
}

export {};
