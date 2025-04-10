import { type Context, Telegraf, session, Markup } from "telegraf";

import { APP_ENV, BOT_TOKEN } from "./env";
import { sessionStore } from "./db";
import { BotContext, BotSession } from "./types";
import { SceneId, stage } from "./scenes";
import { delay, importPTimeout } from "./utils";

const ERROR_FORBIDDEN_BOT_WAS_BLOCKED_BY_THE_USER =
  "403: Forbidden: bot was blocked by the user";

const replyError = (
  context: Context,
  ...replyArgs: Parameters<typeof Context.prototype.reply>
) => {
  replyArgs[0] = `⚠️  ${replyArgs[0]}`;
  return context.reply(...replyArgs);
};

const handleError = async (error: unknown, context: Context) => {
  if (typeof error === "object" && error !== null) {
    if (
      "message" in error &&
      error.message === ERROR_FORBIDDEN_BOT_WAS_BLOCKED_BY_THE_USER
    ) {
      return console.warn(error);
    }
    const { TimeoutError } = await importPTimeout();
    // p-timeout error thrown by telegraf based on `handlerTimeout`
    if ("name" in error && error.name === TimeoutError.name) {
      return await replyError(
        context,
        "Bot takes to much timeout handle this..."
      );
    }
  }

  console.error(error);
  await replyError(context, "Internal error occurred");
};

// Telegram bot server webhook has 60s timeout https://github.com/tdlib/telegram-bot-api/issues/341#issuecomment-1354554550
const BOT_TIMEOUT = 50 * 1000;

export const bot = new Telegraf<BotContext>(BOT_TOKEN, {
  // REQUIRED for `sendChatAction` to work in serverless/webhook environment https://github.com/telegraf/telegraf/issues/1047
  telegram: { webhookReply: false },
  handlerTimeout: BOT_TIMEOUT,
});

bot.use(async (ctx, next) => {
  if (
    ctx.message &&
    "text" in ctx.message &&
    ctx.message.text.startsWith("/")
  ) {
    delete ctx.session?.__scenes;
  }

  return await next();
});

bot.command("cancel", async (context) => {
  // delete context.session.__scenes;
  await context.reply("Left this dialog", {
    ...Markup.removeKeyboard(),
    disable_notification: true,
  });
});

bot.use(
  session({ store: sessionStore, defaultSession: (): BotSession => ({}) })
);

bot.use(stage.middleware());

bot.use(async (context, next) => {
  await context.persistentChatAction("typing", async () => {
    await next();
  });
});

bot.start(async (context) => {
  await context.reply("Hi, it is social translator!");
});

bot.catch(async (error, context) => {
  await handleError(error, context);
});
