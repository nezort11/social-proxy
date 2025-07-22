/**
 * Ingesting job service (daily cron)
 *
 * - ETL job (extract, transform, load)
 */
import http from "serverless-http";
import express from "express";
import { getLatestTweets } from "./tweets";
import { tweetsStore } from "./db";

const app = express();

const ingestLatestTweets = async (author: string) => {
  console.log(`Ingesting latest @${author} tweets...`);
  const tweets = await getLatestTweets(author);

  for (const tweet of tweets) {
    console.log(`Saving tweet ${tweet.id} into database...`);
    // convert tweet createdAt datetime to ISO 8601 cuz YDB does not support advanced datetime parsing
    tweet.createdAt = new Date(tweet.createdAt).toISOString();

    await tweetsStore.set(tweet.id, tweet);
  }

  console.log(
    `Successfully saved ${tweets.length} ingested @${author} tweets`
  );
};

app.use(async (req, res) => {
  try {
    await ingestLatestTweets("oliverburdick");
    await ingestLatestTweets("JohnPiper");
    await ingestLatestTweets("desiringGod");
    await ingestLatestTweets("timkellernyc");
    await ingestLatestTweets("darwintojesus");
    res.status(200).send("Ingestion completed");
  } catch (err) {
    console.error("Ingestion failed:", err);
    res.status(500).send("Ingestion failed");
  }
});

export const handler = http(app);

const main = async () => {
  await ingestLatestTweets("oliverburdick");
  process.exit(0);
};
if (require.main === module) {
  main();
}
