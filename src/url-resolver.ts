import axios from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";

export type ProxyType = "ehp" | "socks" | "none";

export interface ProxyConfig {
  type: ProxyType;
  url?: string; // Required for "socks" and "ehp" types
}

/**
 * Unified function to resolve final URL after all redirects
 * Supports both EHP (Edge HTTP Proxy) and SOCKS5 proxy
 *
 * @param url - The URL to resolve
 * @param proxyConfig - Proxy configuration object
 * @returns The final URL after all redirects
 *
 * @example
 * // Using EHP (Edge HTTP Proxy)
 * const finalUrl = await resolveFinalUrl("https://t.co/abc", {
 *   type: "ehp",
 *   url: "https://famous-donkey-59.deno.dev"
 * });
 *
 * @example
 * // Using SOCKS5 proxy (IPv4 only)
 * const finalUrl = await resolveFinalUrl("https://example.com", {
 *   type: "socks",
 *   url: "socks5://user:pass@host:port"
 * });
 *
 * @example
 * // No proxy
 * const finalUrl = await resolveFinalUrl("https://example.com", {
 *   type: "none"
 * });
 */
export async function resolveFinalUrl(
  url: string,
  proxyConfig: ProxyConfig
): Promise<string> {
  if (proxyConfig.type === "ehp") {
    return getFinalUrlViaEhpProxy(url, proxyConfig.url);
  } else if (proxyConfig.type === "socks") {
    return getFinalUrlViaSocksProxy(url, proxyConfig.url);
  } else {
    return getFinalUrlViaSocksProxy(url, undefined);
  }
}

/**
 * Internal function to get the final URL using EHP (Edge HTTP Proxy)
 */
async function getFinalUrlViaEhpProxy(
  url: string,
  ehpProxyUrl?: string
): Promise<string> {
  if (!ehpProxyUrl) {
    throw new Error("EHP proxy URL is required when using ehp proxy type");
  }

  // Construct the proxy URL by appending the target URL to the proxy base
  const proxyUrl = `${ehpProxyUrl}/${url}`;

  const config: any = {
    timeout: 30000,
    maxRedirects: 0, // Don't follow redirects on the client side
    validateStatus: () => true, // Accept any status code
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  };

  const response = await axios.get(proxyUrl, config);

  // The edge proxy adds X-Final-URL header with the final URL after all redirects
  let finalUrl = response.headers["x-final-url"] || url;

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

/**
 * Internal function to get the final URL using SOCKS5 proxy or direct connection
 * Note: SOCKS5 proxy only works with IPv4
 */
async function getFinalUrlViaSocksProxy(
  url: string,
  socksProxyUrl?: string
): Promise<string> {
  const config: any = {
    timeout: 30000,
    maxRedirects: 10,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  };

  // Add proxy if provided (IPv4 only)
  if (socksProxyUrl) {
    const agent = new SocksProxyAgent(socksProxyUrl);
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

// Legacy exports for backward compatibility
/**
 * @deprecated Use resolveFinalUrl with ProxyConfig instead
 */
export async function getFinalUrl(
  url: string,
  proxyUrl?: string
): Promise<string> {
  return getFinalUrlViaSocksProxy(url, proxyUrl);
}
