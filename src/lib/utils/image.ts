export async function resizeImage(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('resize_failed'))),
			'image/jpeg',
			quality
		);
	});
}

type UploadSignature = {
	uploadUrl: string;
	apiKey: string;
	signature: string;
	params: Record<string, string | number>;
};

export async function uploadToCloudinary(blob: Blob): Promise<string> {
	const signResponse = await fetch('/api/cloudinary/sign', { method: 'POST' });
	if (!signResponse.ok) throw new Error('sign_failed');
	const signed = (await signResponse.json()) as UploadSignature;

	const body = new FormData();
	body.set('file', blob, 'meter.jpg');
	body.set('api_key', signed.apiKey);
	body.set('signature', signed.signature);
	for (const [key, value] of Object.entries(signed.params)) body.set(key, String(value));

	const upload = await fetch(signed.uploadUrl, { method: 'POST', body });
	if (!upload.ok) throw new Error('upload_failed');
	const result = (await upload.json()) as { public_id?: string };
	if (!result.public_id) throw new Error('upload_failed');
	return result.public_id;
}
