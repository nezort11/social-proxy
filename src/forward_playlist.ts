/**
 * Forward job service
 */
import http from "serverless-http";
import express from "express";
import { Api } from "telegram";

import { getChatId } from "./utils";
import { chatsStore, musicStore } from "./db";
import { RPCError } from "telegram/errors";
import { downloadVideo, getPlaylistInfo } from "./ytdl";
import { bot } from "./bot";
import axios from "axios";
import { sleep } from "telegram/Helpers";

const app = express();

const TARGET_CHANNEL_CHAT_ID = getChatId("1857955327");
// const TARGET_CHANNEL_CHAT_ID = getChatId("1246932616");

const forwardPlaylist = async () => {
  console.log("Getting playlist videos info...");
  const playlistInfo = await getPlaylistInfo(
    "https://www.youtube.com/playlist?list=PLsVXlJ_NFVRgSSr6ki-BThf7CY3mTMEHI",
    5 // limit number
  );
  console.log("Playlist info:", playlistInfo);

  // for (const video of playlistInfo.videos) {
  for (let i = playlistInfo.videos.length - 1; i >= 0; i--) {
    const video = playlistInfo.videos[i];
    console.log(`Iterating video ${video.id}...`);

    // check if video already processed - then exit
    const storedVideo = await musicStore.get(video.id);
    if (storedVideo) {
      // return;
      continue;
    }

    // add video to the already processed set
    await musicStore.set(video.id, video);

    console.log(`Processing video ${video.id}...`);

    console.log("Requesting download youtube video audio...");
    const videoDataUrl = await downloadVideo(video.url, "m4a");
    console.log(`Downloaded video ${video.id}: ${videoDataUrl}`);

    console.log("Downloading video audio to buffer...");
    const videoResponse = await axios.get<Buffer>(videoDataUrl, {
      responseType: "arraybuffer",
    });
    const videoBuffer = videoResponse.data;
    console.log("Video buffer length:", videoBuffer.byteLength);

    console.log("Sending audio to target channel...");
    const sendAudioResponse = await bot.telegram.sendAudio(
      TARGET_CHANNEL_CHAT_ID,
      {
        // NOTE: "source" vs "url" - url is always sent as "document" not as "audio"
        source: videoBuffer,
        filename: `${video.title}.mp3`,
      },
      {
        title: video.title,
        performer: "RBC Music", // video.uploader
        duration: video.duration,
      }
    );
    console.log("Sent audio to channel:", sendAudioResponse);

    await sleep(15000);

    // break;
  }
};

app.use(async (req, res) => {
  try {
    await forwardPlaylist();

    res.status(200).send("Forward completed");
  } catch (err) {
    console.error("Forward failed:", err);
    res.status(500).send("Forward failed");
  }
});

export const handler = http(app);

const main = async () => {
  await forwardPlaylist();
  process.exit(0);
};
if (require.main === module) {
  main();
}
