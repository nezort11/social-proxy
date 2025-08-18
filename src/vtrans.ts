import axios from "axios";

import { VIDEO_TRANSLATE_API_URL } from "./env";

const vtransClient = axios.create({
  baseURL: VIDEO_TRANSLATE_API_URL,

  timeout: 15 * 10 ** 6, // 15m
});

export type VideoTranslateResponseData = {
  url: string;
};

export const translateVideo = async (
  videoLink: string,
  videoFileUrl: string,
  targetLanguage?: string
) => {
  const translatedVideoResponse =
    await vtransClient.post<VideoTranslateResponseData>(
      "/translate/full",
      null,
      {
        params: {
          url: videoLink,
          videoUrl: videoFileUrl,
          ...(targetLanguage && { lang: targetLanguage }),
        },
      }
    );

  return translatedVideoResponse.data;
};
