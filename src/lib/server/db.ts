import mongoose from 'mongoose';
import { MONGODB_DB, MONGODB_URI } from '$app/env/private';

type Cache = { conn?: typeof mongoose; promise?: Promise<typeof mongoose> };

const globalCache = globalThis as typeof globalThis & { __mongoose?: Cache };
const cache: Cache = (globalCache.__mongoose ??= {});

export async function connectDb(): Promise<typeof mongoose> {
	if (cache.conn) return cache.conn;
	cache.promise ??= mongoose.connect(MONGODB_URI, {
		dbName: MONGODB_DB,
		bufferCommands: false,
		maxPoolSize: 5
	});
	try {
		cache.conn = await cache.promise;
	} catch (error) {
		cache.promise = undefined;
		throw error;
	}
	return cache.conn;
}
