import axios from "axios";

import { OPENAI_API_BASE_URL, OPENAI_API_KEY } from "./env";

export const openaiClient = axios.create({
  baseURL: OPENAI_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
});

export type GptChoice = {
  message: {
    content: string;
  };
};

export type GptResponseData = {
  choices: GptChoice[];
};
