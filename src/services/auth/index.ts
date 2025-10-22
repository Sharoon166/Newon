import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI || "");
const db = client.db();

export const auth = betterAuth({
    database: mongodbAdapter(db),
    emailAndPassword: {
        enabled: true,
        disableSignUp: true,
    },
    plugins: [nextCookies()]

});