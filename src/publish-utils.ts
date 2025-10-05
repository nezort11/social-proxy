import { PROXY_URL } from "./env";
import { getFinalUrl } from "./url-resolver";

/**
 * Replace t.co links with their final destinations
 */
export const normalizeTextTcoResolvedLinks = async (text: string) => {
  const TCO_LINK_REGEX = /https:\/\/t\.co\/[a-zA-Z0-9]+/g;
  const tcoLinks = text.match(TCO_LINK_REGEX);
  if (!tcoLinks) {
    return text;
  }

  let result = text;
  for (const tcoLink of tcoLinks) {
    try {
      const finalUrl = await getFinalUrl(tcoLink, PROXY_URL);
      result = result.replace(tcoLink, finalUrl);
    } catch {
      // Keep original link as is if resolution fails
    }
  }

  return result;
};
