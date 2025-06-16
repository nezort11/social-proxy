import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { RPCError } from "telegram/errors";

import { API_ID, APP_HASH, SESSION } from "./env";

export class CorruptedSessionStringError extends Error {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(...args);
    this.name = this.constructor.name;
  }
}

export const getClient = async () => {
  const session = new StringSession(SESSION);
  const _telegramClient = new TelegramClient(session, +API_ID, APP_HASH, {
    connectionRetries: 3,
  });

  const isLoggedIn = await _telegramClient.isUserAuthorized();
  if (!isLoggedIn) {
    await new Promise<void>(async (resolve, reject) => {
      const rejectOnSessionExpire = async () => {
        reject(
          new CorruptedSessionStringError(
            "Telegram client session has expired!"
          )
        );
        // Set mock credentials and etc. (will produce exception instead of halting) in case session is expired
        return "";
      };

      try {
        await _telegramClient.start({
          phoneNumber: rejectOnSessionExpire,
          password: rejectOnSessionExpire,
          phoneCode: rejectOnSessionExpire,
          onError: (error) => console.error(error),
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Test some client method to check ahead for RPCError: 406: AUTH_KEY_DUPLICATED
  try {
    await _telegramClient.getMe();
  } catch (error) {
    await _telegramClient.disconnect();
    if (error instanceof RPCError) {
      throw new CorruptedSessionStringError(
        "Telegram client session has been corrupted!",
        { cause: error }
      );
    } else {
      throw error;
    }
  }

  return _telegramClient;
};
