import path from "path";
import * as dotenv from "dotenv";
import { getChatId } from "./utils";

export const LAMBDA_TASK_ROOT = false; //process.env.LAMBDA_TASK_ROOT;
export const MOUNT_ROOT_DIR_PATH = LAMBDA_TASK_ROOT ? "../storage/" : "./";

dotenv.config({ path: path.join(MOUNT_ROOT_DIR_PATH, "./env/.env") });

export const APP_ENV = process.env.APP_ENV;

export const BOT_TOKEN = process.env.BOT_TOKEN_DEV;
// APP_ENV === "local" ? process.env.BOT_TOKEN_DEV : process.env.BOT_TOKEN;

export const YDB_ENDPOINT = process.env.YDB_ENDPOINT;
export const YDB_DATABASE = process.env.YDB_DATABASE;

export const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

export const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const YTDL_API_BASE_URL = process.env.YTDL_API_BASE_URL;

export const PUBLISH_CHANNEL_ID = process.env.PUBLISH_CHANNEL_ID;
export const PUBLISH_CHANNEL_CHAT_ID = getChatId(PUBLISH_CHANNEL_ID);

export const API_ID = process.env.APP_ID!;
export const APP_HASH = process.env.APP_HASH!;
export const SESSION = process.env.SESSION;
