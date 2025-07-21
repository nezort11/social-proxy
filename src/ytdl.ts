import axios from "axios";
import { YTDL_API_BASE_URL } from "./env";

const ytdlClient = axios.create({
  baseURL: YTDL_API_BASE_URL,
});

export const getVideoInfo = async (url: string) => {
  const videoInfoResponse = await ytdlClient.get("/info", {
    params: { url },
  });
  return videoInfoResponse.data;
};

type VideoDownloadResponseData = {
  url: string;
};

export const downloadVideo = async (url: string, format: string) => {
  const videoDownloadResponse =
    await ytdlClient.post<VideoDownloadResponseData>("/download", null, {
      params: { url, ...(format && { format }) },
    });

  return videoDownloadResponse.data.url;
};

export interface VideoItem {
  id: string;
  title: string;
  url: string;
  uploader: string;
  upload_date: string; // Format: YYYYMMDD
  duration: number; // In seconds
}

export interface PlaylistInfo {
  playlist_id: string;
  title: string;
  entries_returned: number;
  videos: VideoItem[];
}

export const getPlaylistInfo = async (
  playlistUrl: string,
  limit?: number
) => {
  const videoInfoResponse = await ytdlClient.get<PlaylistInfo>(
    "/playlist",
    {
      params: { url: playlistUrl, ...(limit && { limit }) },
    }
  );
  return videoInfoResponse.data;
};
