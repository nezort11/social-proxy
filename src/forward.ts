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
import { RPCError } from "telegram/errors";

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
Hi, please determine whether the following post contains any information about job position/vacancy/role (NOT post about somebody who is looking for job / sharing his resume) that is about:
- Frontend/Full-Stack/Backend role
- JavaScript/TypeScript and React/Node.js mainly (Angular/Vue/etc. only if secondary)
- NOT PHP/Java/Ruby/C#
- NOT Intern/Junior position

If false you MUST ONLY reply "0" otherwise "1".

---

`;

const TARGET_CHANNEL_CHAT_ID = getChatId("2703233078");

const TARGET_CHANNEL_CHAT_ID2 = getChatId("3170116782");

// Proxy messages (re-send without forward attribution)
const forwardProxy = async (chat: string) => {
  console.log(`Start proxying messages for @${chat}...`);
  const client = await getClient();
  const channel = (await client.getEntity(`@${chat}`)) as Api.Channel;
  const targetChannel = (await client.getEntity(
    TARGET_CHANNEL_CHAT_ID2
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
  // Sort latest messages in ascending order
  messages = messages.sort((a, b) => a.id - b.id);
  console.log(`Received ${messages.length} latest messages`);

  for (const message of messages) {
    console.log(`Processing proxy message #${message.id}...`);

    // Pre-set processed message id as last processed message
    chatData.lastMessageId = message.id;
    await chatsStore.set(`proxy:${chat}`, chatData);

    try {
      const text = message.message?.trim() ?? "";
      if (text.length === 0) {
        console.log(
          `Skipping empty proxy message #${message.id} (no text to send)`
        );
        continue;
      }
      console.log(
        `Re-sending message #${message.id} without attribution...`
      );
      await client.sendMessage(targetChannel, {
        message: message.message,
        formattingEntities: message.entities,
      });
    } catch (error) {
      console.error(`Failed to proxy message #${message.id}:`, error);
    }
  }
};

const forwardFiltered = async (chat: string) => {
  console.log(`Start monitoring forward for @${chat}...`);
  const client = await getClient();
  const channel = (await client.getEntity(`@${chat}`)) as Api.Channel;
  // const channelFullInfo = await client.invoke(
  //   new Api.channels.GetFullChannel({ channel })
  // );
  // // @ts-expect-error .flags is present and is number
  // const channelCanForward = (channelFullInfo.fullChat.flags & 1) === 0;

  const targetChannel = (await client.getEntity(
    TARGET_CHANNEL_CHAT_ID
  )) as Api.Channel;

  let chatData = await chatsStore.get(chat);
  chatData ??= { lastMessageId: null };
  console.log(`Last processed message was #${chatData.lastMessageId}`);

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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: POSITION_PROMPT + message.text,
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

    try {
      console.log(`Forwarding message #${message.id}...`);
      await message.forwardTo(targetChannel);
    } catch (error) {
      if (
        !(
          error instanceof RPCError &&
          error.errorMessage === "CHAT_FORWARDS_RESTRICTED"
        )
      ) {
        throw error;
      }

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
    try {
      // proxy all messages from @yandexfintech to private channel
      await forwardProxy("yandexfintech");
    } catch (error) {
      console.error(
        "Failed to proxy messages from @yandexfintech:",
        error
      );
    }

    // web3
    await forwardFiltered("opento_crypto");
    await forwardFiltered("workingincrypto");
    await forwardFiltered("cryptoheadhunter");
    await forwardFiltered("job_web3");
    await forwardFiltered("CryptoBlockchainJobs");
    await forwardFiltered("cryptovakansii");
    await forwardFiltered("holder_job_devs");
    // await forwardFiltered("web3hiring");
    await forwardFiltered("careers_crypto"); // careerscrypto.io
    await forwardFiltered("web30job"); // careerscrypto.io
    await forwardFiltered("jobstash");

    await forwardFiltered("tonhunt");
    // remote ok
    // @remoteitjobs_app

    await forwardFiltered("remote_jobs_relocate");
    await forwardFiltered("opento_relocate");
    await forwardFiltered("opento_dev");
    await forwardFiltered("time2find");
    await forwardFiltered("dev_connectablejobs");
    await forwardFiltered("serbia_jobs");

    // other
    await forwardFiltered("Remoteit");
    await forwardFiltered("it_vakansii_jobs");
    await forwardFiltered("backend_frontend_jobs");
    await forwardFiltered("sparklesjobs");

    // await forwardFiltered("g_jobbot");
    // [hh, habr, getmatch, hirify.me bots]

    // bigtech
    await forwardFiltered("ya_jobs");
    await forwardFiltered("avito_career");
    await forwardFiltered("vkjobs");
    await forwardFiltered("tech_kuper");

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
