/**
 * Publishing service
 */
import http from "serverless-http";
import express from "express";
import { Chat } from "telegraf/typings/core/types/typegram";
import { driver, postedStore } from "./db";
import { Session } from "ydb-sdk";
import { Tweet } from "./tweets";
import { bot } from "./bot";
import { getChatId } from "./utils";
import axios from "axios";
import { GptResponseData, openaiClient } from "./openai";
import { PUBLISH_CHANNEL_CHAT_ID } from "./env";

const app = express();

const TARGET_UTC_OFFSET = 3; // Europe/Moscow

const getOneDayPassedUtcHours = (originalUtcOffset: number) => {
  const originalTargetUtcDiff = Math.abs(
    TARGET_UTC_OFFSET - originalUtcOffset
  );
  return 24 - originalTargetUtcDiff;
};

const getOldestTweets = async (
  author: string,
  authorUtcOffset: number
) => {
  console.log(`Getting oldest tweet for @${author}...`);

  await driver.ready(15000);

  const authorOneDayPassedUtcHours =
    getOneDayPassedUtcHours(authorUtcOffset);

  const oldestTweets: Tweet[] = [];
  console.log("Creating ydb driver session...");

  await driver.tableClient.withSession(async (session: Session) => {
    const TWEET_CREATED_AT_TIMESTAMP =
      'CAST(JSON_VALUE(tweets.data, "$.createdAt") AS Timestamp)';
    const query = `
      SELECT
          tweets.data
      FROM tweets
      LEFT JOIN posted ON JSON_VALUE(tweets.data, "$.id") = posted.id
      WHERE posted.id IS NULL
        AND ${TWEET_CREATED_AT_TIMESTAMP} <= CurrentUtcTimestamp() - Interval("PT${authorOneDayPassedUtcHours}H")
        AND JSON_VALUE(tweets.data, "$.author.userName") = "${author}"
      ORDER BY ${TWEET_CREATED_AT_TIMESTAMP}
      LIMIT 1;
    `;

    console.log("Querying ydb table for oldest tweets...");
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

  console.log(`Queried ${oldestTweets.length} oldest @${author} tweets`);
  return oldestTweets;
};

const translateTweet = async (tweetText: string) => {
  const response = await openaiClient.post<GptResponseData>(
    "/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `Please translate the following Twitter post into Russian (for context: twitter profile is about Christianity). Remember to capitalize pronouns referring to God. Your response MUST contain only the translated output.\n\n---\n${tweetText}`,
        },
      ],
      max_tokens: 500, // Adjust this if necessary
    }
  );
  const translatedTweetData = response.data;
  const translatedTweetMessage = translatedTweetData.choices[0].message;
  const translatedTweetMessageText =
    translatedTweetMessage.content as string;

  return translatedTweetMessageText.trim();
};

const publishOldestTweets = async (
  author: string,
  authorUtcOffset: number,
  channelChatId: string
) => {
  console.log(`Publishing tweets for @${author}...`);
  const tweets = await getOldestTweets(author, authorUtcOffset);

  const publishChannelChat = (await bot.telegram.getChat(
    channelChatId
  )) as Chat.ChannelGetChat;
  // const isPrivateChannel = !!publishChannelChat.active_usernames?.length;
  const isPrivateChannel = true;
  // invite link should always be present in private/public channel
  const publishChannelInviteLink = publishChannelChat.invite_link!;

  for (const tweet of tweets) {
    const TCO_LINK_REGEX = /https:\/\/t\.co\/[a-zA-Z0-9]+/g;
    const tcoLinks = tweet.text.match(TCO_LINK_REGEX);

    const resultTweet = tweet.text.replace(TCO_LINK_REGEX, "");
    const translatedTweet = await translateTweet(resultTweet);

    // if private channel include invite link to channel
    const publishMessageHtml = isPrivateChannel
      ? `${translatedTweet}\n\n<a href="${publishChannelInviteLink}">@️ ${publishChannelChat.title}</a>`
      : translatedTweet;
    if (
      tcoLinks &&
      "media" in tweet.extendedEntities &&
      tweet.extendedEntities.media[0]
    ) {
      const tweetMedia = tweet.extendedEntities.media[0];

      await bot.telegram.sendPhoto(
        channelChatId,
        tweetMedia.media_url_https,
        {
          caption: publishMessageHtml,
          parse_mode: "HTML",
        }
      );
    } else {
      await bot.telegram.sendMessage(channelChatId, publishMessageHtml, {
        parse_mode: "HTML",
        link_preview_options: {
          is_disabled: true,
        },
      });
    }

    await postedStore.set(tweet.id, {
      postedAt: new Date().toISOString(),
    });
  }
};

app.use(async (req, res) => {
  await publishOldestTweets(
    "oliverburdick",
    -4, // Boston (EDT)
    PUBLISH_CHANNEL_CHAT_ID
  );
  const desiringGodChannelChatId = getChatId("2502755801");
  await publishOldestTweets(
    "JohnPiper",
    -5, // Minneapolis (CDT)
    desiringGodChannelChatId
  );
  await publishOldestTweets(
    "desiringGod",
    -5, // Minneapolis (CDT)
    desiringGodChannelChatId
  );
  await publishOldestTweets(
    "timkellernyc",
    -4, // NY (EDT)
    getChatId("2414668710")
  );

  await publishOldestTweets(
    "darwintojesus",
    -4 + 3, // NY (EDT)
    getChatId("2751332882")
  );

  res.end();
});

export const handler = http(app);

const main = async () => {
  await publishOldestTweets("oliverburdick", -4, PUBLISH_CHANNEL_CHAT_ID);
  process.exit(0);
};
if (require.main === module) {
  main();
}
