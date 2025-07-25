/**
 * Forward job service
 */
import http from "serverless-http";
import express from "express";
import { Api } from "telegram";

import { getChatId } from "./utils";
import { shortsStore } from "./db";
import { downloadVideo, getPlaylistInfo } from "./ytdl";
import { bot } from "./bot";
import axios from "axios";
import { sleep } from "telegram/Helpers";

const app = express();

const forwardShorts = async () => {
  console.log("Getting playlist videos info...");
  const playlistInfo = await getPlaylistInfo(
    "https://www.youtube.com/playlist?list=UUSHnrFlpro0xfYjz6s5Xa8WWw",
    5 // limit number
  );
  console.log("Playlist info:", playlistInfo);

  // for (const video of playlistInfo.videos) {
  for (let i = playlistInfo.videos.length - 1; i >= 0; i--) {
    const video = playlistInfo.videos[i];
    console.log(`Iterating video ${video.id}...`);

    // check if video already processed - then exit
    const storedVideo = await shortsStore.get(video.id);
    if (storedVideo) {
      return;
    }

    // add video to the already processed set
    await shortsStore.set(video.id, video);

    console.log(`Processing video ${video.id}...`);

    console.log("Requesting download youtube video audio...");
    const videoDataUrl = await downloadVideo(video.url);
    console.log(`Downloaded video ${video.id}: ${videoDataUrl}`);

    console.log("Downloading video to buffer...");
    const videoResponse = await axios.get<Buffer>(videoDataUrl, {
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
        caption: video.title,
        duration: video.duration,
      }
    );
    console.log("Sent video to channel:", sendVideoResponse);

    await sleep(15000);

    // break;
  }
};

app.use(async (req, res) => {
  try {
    await forwardShorts();

    res.status(200).send("Forward completed");
  } catch (err) {
    console.error("Forward failed:", err);
    res.status(500).send("Forward failed");
  }
});

export const handler = http(app);

const main = async () => {
  await forwardShorts();
  process.exit(0);
};
if (require.main === module) {
  main();
}
