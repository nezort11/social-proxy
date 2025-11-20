import { EHP_PROXY_URL } from "./env";
import { resolveFinalUrl, ProxyConfig } from "./url-resolver";

/**
 * Replace t.co links with their final destinations
 * Uses EHP (Edge HTTP Proxy) from environment variable
 */
export const normalizeTextTcoResolvedLinks = async (text: string) => {
  const TCO_LINK_REGEX = /https:\/\/t\.co\/[a-zA-Z0-9]+/g;
  const tcoLinks = text.match(TCO_LINK_REGEX);
  if (!tcoLinks) {
    return text;
  }

  // Use EHP proxy if available, otherwise fail
  if (!EHP_PROXY_URL) {
    console.error("EHP_PROXY_URL not configured in environment");
    return text;
  }

  const proxyConfig: ProxyConfig = {
    type: "ehp",
    url: EHP_PROXY_URL,
  };

  console.log(
    `Resolving t.co links using EHP proxy (${EHP_PROXY_URL})...`
  );

  let result = text;
  for (const tcoLink of tcoLinks) {
    try {
      const finalUrl = await resolveFinalUrl(tcoLink, proxyConfig);
      console.log(`  ${tcoLink} -> ${finalUrl}`);
      result = result.replace(tcoLink, finalUrl);
    } catch (error) {
      console.error(`  Failed to resolve ${tcoLink}:`, error);
      // Keep original link as is if resolution fails
    }
  }

  return result;
};
