import { Driver, getCredentialsFromEnv, TypedValues } from "ydb-sdk";
import { Ydb } from "telegraf-session-store-ydb";
import path from "path";
import {
  LAMBDA_TASK_ROOT,
  MOUNT_ROOT_DIR_PATH,
  YDB_DATABASE,
  YDB_ENDPOINT,
} from "./env";
import { VideoItem } from "./ytdl";

if (!LAMBDA_TASK_ROOT) {
  process.env.YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS = path.resolve(
    __dirname,
    "../env/yc_sakey.json"
  );
}

export const driver = new Driver({
  endpoint: YDB_ENDPOINT,
  database: YDB_DATABASE,
  authService: getCredentialsFromEnv(),
});

// // Generic Redis-like store-table in YDB
// export const store = Ydb<any>({
//   driver,
//   driverOptions: { enableReadyCheck: true },
//   tableOptions: {
//     shouldCreateTable: true,
//     tableName: "store",
//     keyColumnName: "key",
//     sessionColumnName: "value",
//   },
// });

export const sessionStore = Ydb<any>({
  driver,
  driverOptions: { enableReadyCheck: true },
  tableOptions: {
    shouldCreateTable: true,
    tableName: "sessions",
  },
});

export const tweetsStore = Ydb<any>({
  driver,
  driverOptions: { enableReadyCheck: true },
  tableOptions: {
    shouldCreateTable: true,
    tableName: "tweets",
    keyColumnName: "id",
    sessionColumnName: "data",
  },
});

type Posted = {
  postedAt: string; // ISO 8601 datetime
};

export const postedStore = Ydb<Posted>({
  driver,
  driverOptions: { enableReadyCheck: true },
  tableOptions: {
    shouldCreateTable: true,
    tableName: "posted",
    keyColumnName: "id",
    sessionColumnName: "data",
  },
});

type ChatState = {
  lastMessageId: number | null;
};

export const chatsStore = Ydb<ChatState>({
  driver,
  driverOptions: { enableReadyCheck: true },
  tableOptions: {
    shouldCreateTable: true,
    tableName: "chats",
    keyColumnName: "id",
    sessionColumnName: "data",
  },
});

export const musicStore = Ydb<VideoItem>({
  driver,
  driverOptions: { enableReadyCheck: true },
  tableOptions: {
    shouldCreateTable: true,
    tableName: "music",
    keyColumnName: "id",
    sessionColumnName: "data",
  },
});

export const shortsStore = Ydb<VideoItem>({
  driver,
  driverOptions: { enableReadyCheck: true },
  tableOptions: {
    shouldCreateTable: true,
    tableName: "shorts",
    keyColumnName: "id",
    sessionColumnName: "data",
  },
});
