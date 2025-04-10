import { type WizardContext } from "telegraf/scenes";

export type BotSession = {
  ownerAddress?: string;
};

export type BotContext = WizardContext & {
  session: WizardContext["session"] & BotSession;
};
