import axios from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";

/**
 * Simple function to get the final URL after all redirects
 * @param url - The URL to resolve
 * @param proxyUrl - Optional SOCKS5 proxy URL (e.g., "socks5://user:pass@host:port")
 * @returns The final URL after all redirects
 */
export async function getFinalUrl(
  url: string,
  proxyUrl?: string
): Promise<string> {
  const config: any = {
    timeout: 30000,
    maxRedirects: 10,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  };

  // Add proxy if provided
  if (proxyUrl) {
    const agent = new SocksProxyAgent(proxyUrl);
    config.httpsAgent = agent;
    config.httpAgent = agent;
  }

  const response = await axios.get(url, config);

  // Get the final URL after redirects
  let finalUrl = response.request?.res?.responseUrl || url;

  // Check for meta refresh redirects in the content
  if (response.data && typeof response.data === "string") {
    const metaRefreshMatch = response.data.match(
      /<meta[^>]*refresh[^>]*url=([^"'>\s]+)/i
    );
    if (metaRefreshMatch) {
      finalUrl = metaRefreshMatch[1];
    }

    // Also check for title that might contain the redirect URL
    const titleMatch = response.data.match(
      /<title[^>]*>([^<]+)<\/title>/i
    );
    if (titleMatch && titleMatch[1].startsWith("http")) {
      finalUrl = titleMatch[1].trim();
    }
  }

  return finalUrl;
}
