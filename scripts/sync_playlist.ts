import fs from "fs";
import * as child_process from "child_process";
import axios from "axios";
import { getChatId } from "../src/utils";
import { musicStore } from "../src/db";
import { downloadVideo } from "../src/ytdl";
import { bot } from "../src/bot";
import { sleep } from "telegram/Helpers";

const TARGET_CHANNEL_CHAT_ID = getChatId("1857955327");

const syncPlaylist = async () => {
  console.log("Loading playlist.json...");
  const playlistItems = JSON.parse(fs.readFileSync("playlist.json", "utf8"));
  console.log(`Loaded ${playlistItems.length} videos from playlist.`);

  for (let i = playlistItems.length - 1; i >= 0; i--) {
    const video = playlistItems[i];
    
    // Some entries might be private or deleted (title might be [Private video])
    if (!video.id || video.title?.includes("[Private video]") || video.title?.includes("[Deleted video]")) {
      continue;
    }

    const storedVideo = await musicStore.get(video.id);
    if (storedVideo) {
      continue;
    }

    console.log(`Processing new video ${video.id} - ${video.title}...`);

    try {
      console.log("Requesting download youtube video audio locally...");
      const tempId = `temp_${video.id}`;
      // Download bestaudio and pipe it to stdout
      const audioBuffer = child_process.execSync(
        `/Users/nezort11/.local/bin/yt-dlp --proxy "socks5://uGE7vX:sEnRPs@38.152.25.17:8000" -f "bestaudio[ext=m4a]" -o "-" "${video.url}"`,
        { maxBuffer: 100 * 1024 * 1024 } // 100MB buffer just in case
      );
      const videoBuffer = audioBuffer;
      console.log("Video buffer length:", videoBuffer.byteLength);

      const normalizedTitle = video.title.replace(/\s+/g, " ").trim();

      const sendAudioResponse = await bot.telegram.sendAudio(
        TARGET_CHANNEL_CHAT_ID,
        {
          source: videoBuffer,
          filename: `${normalizedTitle}.mp3`,
        },
        {
          title: normalizedTitle,
          performer: "RBC Music", 
          duration: video.duration,
        }
      );
      console.log(`Sent audio to channel. Message ID: ${sendAudioResponse.message_id}`);

      // add video to the already processed set
      await musicStore.set(video.id, {
        id: video.id,
        title: video.title,
        url: video.url,
        uploader: video.uploader || video.channel,
        duration: video.duration,
        upload_date: "20260404"
      });
    } catch (err) {
      // what every happens suddenly or not - just log it and continue to next
       const error = err as Error;
      console.error("Error processing video:", video.id, "error:", error.message);
    }

    await sleep(15000);
  }
  
  console.log("Finished syncing ALL missing songs.");
};

syncPlaylist()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
