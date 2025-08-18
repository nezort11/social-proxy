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

const forwardShorts = async (playlistUrl: string) => {
  console.log("Getting playlist videos info...");
  const playlistInfo = await getPlaylistInfo(
    playlistUrl,
    3 // limit number
  );
  console.log("Playlist info:", playlistInfo);

  // for (const video of playlistInfo.videos) {
  for (let i = playlistInfo.videos.length - 1; i >= 0; i--) {
    const video = playlistInfo.videos[i];
    console.log(`Iterating video ${video.id}...`);

    // check if video already processed - then exit
    const storedVideo = await shortsStore.get(video.id);
    if (storedVideo) {
      continue;
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
      getChatId("2638427623"),
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

    await sleep(15000);

    // break;
  }
};

app.use(async (req, res) => {
  try {
    // Desiring God
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSHnrFlpro0xfYjz6s5Xa8WWw"
    );
    // HEBREW Ministries
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSH0E50PbM6nV8hyPwaZLScEQ"
    );
    // Sermon Jams
    await forwardShorts(
      "https://www.youtube.com/playlist?list=UUSHV2XMCDq67_szgVPW9AHHtQ"
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
