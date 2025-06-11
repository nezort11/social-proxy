/**
 * Publishing service
 */
import http from "serverless-http";
import express from "express";
import { driver, postedStore } from "./db";
import { Session } from "ydb-sdk";
import { Tweet } from "./tweets";
import { bot } from "./bot";
import { getChatId } from "./utils";
import axios from "axios";
import {
  OPENAI_API_BASE_URL,
  OPENAI_API_KEY,
  PUBLISH_CHANNEL_CHAT_ID,
} from "./env";

const app = express();

const ORIGINAL_UTC_OFFSET = -4; // Boston
const TARGET_UTC_OFFSET = 3;
const ORIGINAL_TARGET_UTC_DIFF = Math.abs(
  TARGET_UTC_OFFSET - ORIGINAL_UTC_OFFSET
);
const ONE_DAY_PASSED_UTC_HOURS = 24 - ORIGINAL_TARGET_UTC_DIFF;

const getOldestTweets = async () => {
  await driver.ready(15000);

  const oldestTweets: Tweet[] = [];
  await driver.tableClient.withSession(async (session: Session) => {
    const query = `
      SELECT
          tweets.data
      FROM tweets
      LEFT JOIN posted ON JSON_VALUE(tweets.data, "$.id") = posted.id
      WHERE posted.id IS NULL
        AND CAST(JSON_VALUE(tweets.data, "$.createdAt") AS Timestamp) <= CurrentUtcTimestamp() - Interval("PT${ONE_DAY_PASSED_UTC_HOURS}H")
      ORDER BY CAST(JSON_VALUE(tweets.data, "$.createdAt") AS Timestamp)
      LIMIT 1;
    `;

    const result = await session.executeQuery(query);
    const rows = result.resultSets[0].rows;
    if (rows) {
      for (const row of rows) {
        const tweetDataText = row.items![0].textValue!;
        const tweetData = JSON.parse(tweetDataText);
        oldestTweets.push(tweetData);
      }
    }
  });

  console.log(`Queried ${oldestTweets.length} oldest tweets`);
  return oldestTweets;
};

const translateTweet = async (tweetText: string) => {
  const response = await axios.post(
    "/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `Please translate the following Twitter post into Russian (for context: twitter profile is about radical Christianity). Remember to capitalize pronouns referring to God. Your response MUST contain only the translated output.\n\n---\n${tweetText}`,
        },
      ],
      max_tokens: 500, // Adjust this if necessary
    },
    {
      baseURL: OPENAI_API_BASE_URL,
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  const translatedTweetData = response.data;
  const translatedTweetMessage = translatedTweetData.choices[0].message;
  const translatedTweetMessageText =
    translatedTweetMessage.content as string;

  return translatedTweetMessageText.trim();
};

const publishOldestTweets = async () => {
  const tweets = await getOldestTweets();

  for (const tweet of tweets) {
    const TCO_LINK_REGEX = /https:\/\/t\.co\/[a-zA-Z0-9]+/g;
    const tcoLinks = tweet.text.match(TCO_LINK_REGEX);

    const resultTweet = tweet.text.replace(TCO_LINK_REGEX, "");
    const translatedTweet = await translateTweet(resultTweet);
    if (
      tcoLinks &&
      "media" in tweet.extendedEntities &&
      tweet.extendedEntities.media[0]
    ) {
      const tweetMedia = tweet.extendedEntities.media[0];

      await bot.telegram.sendPhoto(
        PUBLISH_CHANNEL_CHAT_ID,
        tweetMedia.media_url_https,
        {
          caption: translatedTweet,
        }
      );
    } else {
      await bot.telegram.sendMessage(
        PUBLISH_CHANNEL_CHAT_ID,
        translatedTweet
      );
    }

    await postedStore.set(tweet.id, {
      postedAt: new Date().toISOString(),
    });
  }
};

app.use(async (req, res) => {
  await publishOldestTweets();
  res.end();
});

export const handler = http(app);

const main = async () => {
  await publishOldestTweets();
  process.exit(0);
};
if (require.main === module) {
  main();
}
