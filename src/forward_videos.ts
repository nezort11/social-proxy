/**
 * Forward job service
 */
import http from "serverless-http";
import express from "express";
import axios from "axios";
import { sleep } from "telegram/Helpers";

import { getChatId } from "./utils";
import { shortsStore } from "./db";
import { downloadVideo, getPlaylistInfo } from "./ytdl";
import { bot } from "./bot";

import { translateVideo } from "./vtrans";

const app = express();

const TARGET_CHANNEL_CHAT_ID = getChatId("2638427623");

const forwardShorts = async (
  playlistUrl: string,
  options?: {
    titleWhitelistRegex?: RegExp;
  }
) => {
  console.log("Getting playlist videos info...");
  try {
    const playlistInfo = await getPlaylistInfo(
      playlistUrl,
      3 // limit number
    );
    console.log("Playlist info:", playlistInfo);

    // for (const video of playlistInfo.videos) {
    for (let i = playlistInfo.videos.length - 1; i >= 0; i--) {
      const video = playlistInfo.videos[i];
      console.log(`Iterating video ${video.id}...`);

      try {
        // check if video already processed - then exit
        const storedVideo = await shortsStore.get(video.id);
        if (storedVideo) {
          continue;
        }

        // Filter by title whitelist if provided
        if (options?.titleWhitelistRegex) {
          if (!options.titleWhitelistRegex.test(video.title)) {
            console.log(
              `Skipping video ${video.id} - title "${video.title}" doesn't match whitelist pattern`
            );
            continue;
          }
          console.log(
            `Video ${video.id} title "${video.title}" matches whitelist pattern`
          );
        }

        console.log(`Processing video ${video.id}...`);

        console.log("Requesting download youtube video...");
        const videoDataUrl = await downloadVideo(video.url);
        console.log(`Downloaded video ${video.id}: ${videoDataUrl}`);

        console.log("Translating full video...");
        const translatedVideoData = await translateVideo(
          video.url,
          videoDataUrl,
          "ru"
        );
        const translatedVideoUrl = translatedVideoData.url;
        console.log(
          "Translated full video:",
          translatedVideoData,
          translatedVideoUrl
        );

        console.log("Downloading video to buffer...");
        const videoResponse = await axios.get<Buffer>(translatedVideoUrl, {
          responseType: "arraybuffer",
        });
        const videoBuffer = videoResponse.data;
        console.log("Video buffer length:", videoBuffer.byteLength);

        console.log("Sending video to target channel...");
        const sendVideoResponse = await bot.telegram.sendVideo(
          TARGET_CHANNEL_CHAT_ID,
          {
            // NOTE: "source" vs "url" - url is always sent as "document" not as "audio"
            source: videoBuffer,
            filename: `${video.title}.mp4`,
          },
          {
            // title: video.title,
            // performer: "RBC Music", // video.uploader
            // caption: video.title, // it looks better and more intrigue without title
            duration: video.duration,
            width: 1080, // 180
            height: 1920, // 320
          }
        );
        console.log("Sent video to channel:", sendVideoResponse);

        // add video to the already processed set
        await shortsStore.set(video.id, video);
      } catch (err) {
        console.error("Error processing video:", video.id, "error:", err);
        continue;
      }

      await sleep(15000);
    }
  } catch (err) {
    console.error("Forward failed:", err);
  }
};

const getYoutubeChannelShortsPlaylistUrl = (channelId: string) => {
  // "UC..." -> "UUSH..."
  const channelShortsPlaylistId = "UUSH" + channelId.slice(2);
  return `https://www.youtube.com/playlist?list=${channelShortsPlaylistId}`;
};

app.use(async (req, res) => {
  try {
    // Gospel Coalition (no Tim Keller) = just cringe!
    // await forwardShorts(
    //   getYoutubeChannelShortsPlaylistUrl("UCQMwm-DeHyFK5VPp6KySR5Q")
    // );
    // Gospel in Life (only Tim keller) - NO SHORTS
    // await forwardShorts(
    //   getYoutubeChannelShortsPlaylistUrl("UCQmUmqrMGfnesNpdL7T282Q")
    // );
    // Desiring God
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSHnrFlpro0xfYjz6s5Xa8WWw"
    );

    // HEBREW Ministries (filtered for good preachers only)
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSH0E50PbM6nV8hyPwaZLScEQ",
      {
        titleWhitelistRegex: /Paul Washer|R\.C\. Sproul|John Piper/i,
      }
    );
    // Sermon Jams (mostly Paul Washer)
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSHV2XMCDq67_szgVPW9AHHtQ"
    );

    // Grace to You
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSHneKpMu9SFGlt2usTdAI75A"
    );
    // Ligonier Ministries
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSHut8939DdQsJI3Gw1ziAc4w"
    );
    // Wretched
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSHdlxWNzGGPKzQLMXkkyZkUQ"
    );

    // Cross Examined (Too many not interesting?)
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSHedYGs_lqq1uNet0u7qlSyQ"
    );
    // Answers in Genesis (Apologetics)
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSHicvc24eAbFp-thRrBnSP2A"
    );
    // Bible Animations
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSHRKZqt7rf6_Lo5rFwuPTKmw"
    );

    res.status(200).send("Forward completed");
  } catch (err) {
    console.error("Forward failed:", err);
    res.status(500).send("Forward failed");
  }
});

export const handler = http(app);

const main = async () => {
  await forwardShorts(
    // "https://www.youtube.com/playlist?list=UUSHnrFlpro0xfYjz6s5Xa8WWw"
    "https://www.youtube.com/playlist?list=UUSH0E50PbM6nV8hyPwaZLScEQ"
  );
  process.exit(0);
};
if (require.main === module) {
  main();
}
