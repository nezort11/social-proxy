import http from "serverless-http";
import express from "express";
import { Api } from "telegram";
import { RPCError } from "telegram/errors";

import { getClient } from "./telegram";
import { getChatId } from "./utils";
import { chatsStore } from "./db";

const app = express();

const TARGET_CHANNEL_CHAT_ID = getChatId("3170116782");

const forwardProxy = async (chat: string) => {
  console.log(`Start proxying messages for @${chat}...`);
  const client = await getClient();
  const channel = (await client.getEntity(`@${chat}`)) as Api.Channel;
  const targetChannel = (await client.getEntity(
    TARGET_CHANNEL_CHAT_ID
  )) as Api.Channel;

  let chatData = await chatsStore.get(`proxy:${chat}`);
  chatData ??= { lastMessageId: null };
  console.log(
    `Last processed proxy message was #${chatData.lastMessageId}`
  );

  console.log("Getting latest messages...");
  let messages = await client.getMessages(channel, {
    ...(chatData.lastMessageId ? { minId: chatData.lastMessageId } : {}),
    limit: 10,
  });
  messages = messages.sort((a, b) => a.id - b.id);
  console.log(`Received ${messages.length} latest messages`);

  for (const message of messages) {
    console.log(`Processing proxy message #${message.id}...`);

    chatData.lastMessageId = message.id;
    await chatsStore.set(`proxy:${chat}`, chatData);

    try {
      console.log(
        `Forwarding message #${message.id} with hidden author attribution...`
      );
      await client.forwardMessages(targetChannel, {
        messages: message.id,
        fromPeer: channel,
        dropAuthor: true,
      });
    } catch (error) {
      if (
        !(
          error instanceof RPCError &&
          error.errorMessage === "CHAT_FORWARDS_RESTRICTED"
        )
      ) {
        console.error(`Failed to proxy message #${message.id}:`, error);
        continue;
      }

      try {
        const text = message.message?.trim() ?? "";
        if (text.length === 0) {
          console.log(
            `Skipping empty proxy message #${message.id} (no text to send)`
          );
          continue;
        }
        console.log(
          `Forward restricted, re-sending message #${message.id} without attribution...`
        );
        await client.sendMessage(targetChannel, {
          message: message.message,
          formattingEntities: message.entities,
        });
      } catch (copyError) {
        console.error(
          `Failed to fallback-copy proxy message #${message.id}:`,
          copyError
        );
      }
    }
  }
};

app.use(async (req, res) => {
  try {
    const chat = (req.query.chat as string) || "yandexfintech";
    await forwardProxy(chat);
    res.status(200).send("Forward proxy completed");
  } catch (err) {
    console.error("Forward proxy failed:", err);
    res.status(500).send("Forward proxy failed");
  }
});

export const handler = http(app);

const main = async () => {
  await forwardProxy("yandexfintech");
  process.exit(0);
};
if (require.main === module) {
  main();
}
