/**
 * Forward job service
 */
import http from "serverless-http";
import express from "express";
import { Api } from "telegram";

import { getClient } from "./telegram";
import { GptResponseData, openaiClient } from "./openai";
import { getChatId } from "./utils";
import { chatsStore } from "./db";

const app = express();

// shift entities IN-PLACE
function shiftEntities(
  entities: Api.TypeMessageEntity[] | undefined,
  shiftBy: number,
  position: "prepend" | "append"
): Api.TypeMessageEntity[] | undefined {
  if (!entities) return undefined;

  if (position === "prepend") {
    for (const entity of entities) {
      entity.offset += shiftBy;
    }
  }

  // For append — no offset shift needed
  return entities;
}

const POSITION_PROMPT = `
Hi, please determine whether the following post contains any information about job position/vacancy for Frontend/Full-Stack/Backend in JavaScript/TypeScript/React.

If false you MUST ONLY reply "0" otherwise "1".
`;

const TARGET_CHANNEL_CHAT_ID = getChatId("2703233078");

const forwardFiltered = async (chat: string) => {
  console.log(`Starting forwarding for @${chat}...`);
  const client = await getClient();
  const channel = (await client.getEntity(`@${chat}`)) as Api.Channel;
  const channelFullInfo = await client.invoke(
    new Api.channels.GetFullChannel({ channel })
  );
  // @ts-expect-error .flags is present and is number
  const channelCanForward = (channelFullInfo.fullChat.flags & 1) === 0;

  const targetChannel = (await client.getEntity(
    TARGET_CHANNEL_CHAT_ID
  )) as Api.Channel;

  let chatData = await chatsStore.get(chat);
  chatData ??= { lastMessageId: null };
  console.log(`Last message id is #${chatData.lastMessageId}`);

  console.log("Getting latest messages...");
  let messages = await client.getMessages(channel, {
    ...(chatData.lastMessageId ? { minId: chatData.lastMessageId } : {}),
    limit: 3,
  });
  // Sort latest messages in ascending order
  messages = messages.sort((a, b) => a.id - b.id);
  console.log(`Received ${messages.length} latest messages`);

  for (const message of messages) {
    console.log(`Processing message #${message.id}...`);

    // Pre-set processed message id as last processed message
    chatData.lastMessageId = message.id;
    await chatsStore.set(chat, chatData);

    console.log(`Filtering message #${message.id}...`);
    const response = await openaiClient.post<GptResponseData>(
      "/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `${POSITION_PROMPT}\n\n---\n${message.text}`,
          },
        ],
        max_tokens: 500, // Adjust this if necessary
      }
    );

    const isFilteredPostData = response.data;
    const isFilteredPostMessage = isFilteredPostData.choices[0].message;
    const isFilteredPost = isFilteredPostMessage.content;
    console.log(`Message #${message.id} is filter ${isFilteredPost}`);
    if (isFilteredPost === "0") {
      continue;
    }

    if (channelCanForward) {
      console.log(`Forwarding message #${message.id}...`);
      await message.forwardTo(targetChannel);
    } else {
      console.log(`Resending message #${message.id}...`);
      const prependedText = `https://t.me/${channel.username}/${message.id}\n\n`;
      shiftEntities(message.entities, prependedText.length, "prepend");
      await client.sendMessage(targetChannel, {
        message: prependedText + message.message,
        formattingEntities: message.entities,
      });
    }
  }
};

app.use(async (req, res) => {
  try {
    // @opento_crypto
    // @workingincrypto
    await forwardFiltered("opento_crypto");

    res.status(200).send("Forward completed");
  } catch (err) {
    console.error("Forward failed:", err);
    res.status(500).send("Forward failed");
  }
});

export const handler = http(app);

const main = async () => {
  await forwardFiltered("opento_crypto");
  process.exit(0);
};
if (require.main === module) {
  main();
}
