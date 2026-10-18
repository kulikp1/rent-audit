import { defineEnvVars } from '@sveltejs/kit/env';

const required = (name: string) => (value: string | undefined) => {
	if (!value) throw new Error(`${name} is required`);
	return value;
};

const optional =
	(fallback = '') =>
	(value: string | undefined) =>
		value || fallback;

const secret = (name: string) => (value: string | undefined) => {
	if (!value || value.length < 32) throw new Error(`${name} must be at least 32 characters`);
	return value;
};

const url = (name: string) => (value: string | undefined) => {
	if (!value) throw new Error(`${name} is required`);
	try {
		return new URL(value).origin;
	} catch {
		throw new Error(`${name} must be a valid URL`);
	}
};

export const variables = defineEnvVars({
	MONGODB_URI: { schema: required('MONGODB_URI'), description: 'MongoDB Atlas connection string' },
	MONGODB_DB: { schema: optional('rent-audit'), description: 'Database name' },
	PUBLIC_APP_URL: { schema: url('PUBLIC_APP_URL'), description: 'Public origin of the app' },
	GOOGLE_CLIENT_ID: { schema: required('GOOGLE_CLIENT_ID') },
	GOOGLE_CLIENT_SECRET: { schema: required('GOOGLE_CLIENT_SECRET') },
	JWT_ACCESS_SECRET: { schema: secret('JWT_ACCESS_SECRET') },
	JWT_REFRESH_SECRET: { schema: secret('JWT_REFRESH_SECRET') },
	ADMIN_EMAIL: { schema: optional() },
	CLOUDINARY_CLOUD_NAME: { schema: optional() },
	CLOUDINARY_API_KEY: { schema: optional() },
	CLOUDINARY_API_SECRET: { schema: optional() },
	GEMINI_API_KEY: { schema: optional() },
	GEMINI_MODEL: { schema: optional('gemini-flash-latest') },
	CRON_SECRET: { schema: optional() }
});
