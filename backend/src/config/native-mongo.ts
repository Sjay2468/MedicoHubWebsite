import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export const getNativeMongoClient = async () => {
    if (client) return client;

    if (!clientPromise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        client = new MongoClient(uri);
        clientPromise = client.connect().then((connected) => {
            client = connected;
            return connected;
        });
    }

    return clientPromise;
};

export const getNativeDb = async () => {
    const mongoClient = await getNativeMongoClient();
    return mongoClient.db();
};
