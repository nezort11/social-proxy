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

const ingestLatestTweets = async () => {
  console.log("Ingesting latest tweets...");
  const tweets = await getLatestTweets();

  for (const tweet of tweets) {
    console.log(`Saving tweet ${tweet.id} into database...`);
    // convert tweet createdAt datetime to ISO 8601 cuz YDB does not support advanced datetime parsing
    tweet.createdAt = new Date(tweet.createdAt).toISOString();

    await tweetsStore.set(tweet.id, tweet);
  }

  console.log(`Successfully saved ${tweets.length} ingested tweets`);
};

app.use(async (req, res) => {
  try {
    await ingestLatestTweets();
    res.status(200).send("Ingestion completed");
  } catch (err) {
    console.error("Ingestion failed:", err);
    res.status(500).send("Ingestion failed");
  }
});

export const handler = http(app);

const main = async () => {
  await ingestLatestTweets();
  process.exit(0);
};
if (require.main === module) {
  main();
}
