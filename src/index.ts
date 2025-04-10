import { bot } from "./bot";

import http from "serverless-http";

export const handler = http(bot.webhookCallback("/webhook"));

if (require.main === module) {
  bot.launch();

  bot.telegram.getMe().then((botInfo) => {
    console.log(
      `🚀 Started bot server on https://t.me/${botInfo.username}`
    );
  });
}
