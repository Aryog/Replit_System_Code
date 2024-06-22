import { BlobServiceClient, ContainerClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import * as fs from "fs";
import * as path from "path";

// Initialize the BlobServiceClient
const account = process.env.AZURE_STORAGE_ACCOUNT_NAME || "";
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || "";
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "";

const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new BlobServiceClient(
	`https://${account}.blob.core.windows.net`,
	sharedKeyCredential
);

const containerClient: ContainerClient = blobServiceClient.getContainerClient(containerName);

export const fetchAzureFolder = async (prefix: string, localPath: string): Promise<void> => {
	try {
		for await (const blob of containerClient.listBlobsFlat({ prefix })) {
			const blobClient = containerClient.getBlobClient(blob.name);
			const downloadBlockBlobResponse = await blobClient.download();

			if (downloadBlockBlobResponse.readableStreamBody) {
				const filePath = path.join(localPath, blob.name.replace(prefix, ""));
				await writeFile(filePath, downloadBlockBlobResponse.readableStreamBody);
				console.log(`Downloaded ${blob.name} to ${filePath}`);
			}
		}
	} catch (error) {
		console.error('Error fetching folder:', error);
	}
};

export const copyAzureFolder = async (sourcePrefix: string, destinationPrefix: string): Promise<void> => {
	try {
		for await (const blob of containerClient.listBlobsFlat({ prefix: sourcePrefix })) {
			const sourceBlobClient = containerClient.getBlobClient(blob.name);
			const destinationBlobName = blob.name.replace(sourcePrefix, destinationPrefix);
			const destinationBlobClient = containerClient.getBlobClient(destinationBlobName);

			const copyPoller = await destinationBlobClient.beginCopyFromURL(sourceBlobClient.url);
			await copyPoller.pollUntilDone();

			console.log(`Copied ${blob.name} to ${destinationBlobName}`);
		}
	} catch (error) {
		console.error('Error copying folder:', error);
	}
};

export const saveToAzure = async (key: string, filePath: string, content: string | Buffer): Promise<void> => {
	try {
		const blobName = `${key}${filePath}`;
		const blockBlobClient = containerClient.getBlockBlobClient(blobName);
		await blockBlobClient.upload(content, content.length);
		console.log(`Uploaded blob ${blobName}`);
	} catch (error) {
		console.error('Error uploading to Azure:', error);
	}
};

async function writeFile(filePath: string, readableStream: NodeJS.ReadableStream): Promise<void> {
	await createFolder(path.dirname(filePath));
	return new Promise((resolve, reject) => {
		const writeStream = fs.createWriteStream(filePath);
		readableStream.pipe(writeStream);
		writeStream.on('finish', resolve);
		writeStream.on('error', reject);
	});
}

function createFolder(dirName: string): Promise<void> {
	return new Promise((resolve, reject) => {
		fs.mkdir(dirName, { recursive: true }, (err) => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}
