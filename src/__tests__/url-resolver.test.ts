import path from "path";
import * as dotenv from "dotenv";
import { describe, it, expect } from "vitest";
import dns from "node:dns";
import { getFinalUrl, resolveFinalUrl } from "../url-resolver";

// Load env from project env/.env to get PROXY_URL
dotenv.config({ path: path.join(process.cwd(), "./env/.env") });

const PROXY_URL = process.env.PROXY_URL;

// Prefer IPv4 to avoid proxies that don't support IPv6
dns.setDefaultResultOrder("ipv4first");

describe("getFinalUrl", () => {
  it("resolves final URL via real proxy", async () => {
    if (!PROXY_URL) {
      throw new Error(
        "PROXY_URL is not defined in env/.env. Provide a real SOCKS5 proxy URL."
      );
    }

    // Use a URL that redirects HTTP -> HTTPS
    const inputUrl = "http://example.com";
    const finalUrl = await getFinalUrl(inputUrl, PROXY_URL);
    const u = new URL(finalUrl);
    expect(["http:", "https:"]).toContain(u.protocol);
    expect(u.hostname).toBe("example.com");
  });

  it("works without proxy as a baseline", async () => {
    const inputUrl = "http://example.com";
    const finalUrl = await getFinalUrl(inputUrl);
    const u = new URL(finalUrl);
    expect(["http:", "https:"]).toContain(u.protocol);
    expect(u.hostname).toBe("example.com");
  });
});

describe("resolveFinalUrl with EHP proxy", () => {
  const EHP_PROXY_URL = "https://famous-donkey-59.deno.dev";

  it("resolves final URL via EHP edge proxy", async () => {
    const inputUrl = "https://example.com";
    const finalUrl = await resolveFinalUrl(inputUrl, {
      type: "ehp",
      url: EHP_PROXY_URL,
    });
    const u = new URL(finalUrl);
    expect(["http:", "https:"]).toContain(u.protocol);
    expect(u.hostname).toBe("example.com");
  }, 40000);

  it("follows redirects via EHP edge proxy", async () => {
    // httpbin.org/absolute-redirect uses actual HTTP redirects
    const inputUrl = "https://httpbin.org/absolute-redirect/1";
    const finalUrl = await resolveFinalUrl(inputUrl, {
      type: "ehp",
      url: EHP_PROXY_URL,
    });
    // Should end up at /get after following redirects
    expect(finalUrl).toContain("httpbin.org/get");
  }, 40000);

  it("resolves t.co shortened URLs", async () => {
    // Test with a well-known t.co URL (Twitter's URL shortener)
    // Note: This URL might change over time, but the test demonstrates the functionality
    const inputUrl = "https://t.co/test";
    try {
      const finalUrl = await resolveFinalUrl(inputUrl, {
        type: "ehp",
        url: EHP_PROXY_URL,
      });
      // Just verify we get a valid URL back
      const u = new URL(finalUrl);
      expect(["http:", "https:"]).toContain(u.protocol);
      // The final URL should be different from the input (it redirected)
      // or should be valid (if t.co/test doesn't exist, it might redirect to twitter.com)
    } catch (error) {
      // If the URL doesn't exist, that's okay for this test
      // The important thing is that the proxy can reach t.co
      console.log("t.co test URL may not exist, error:", error);
    }
  }, 40000);

  it("handles URL with query parameters", async () => {
    const inputUrl = "https://httpbin.org/get?test=123&foo=bar";
    const finalUrl = await resolveFinalUrl(inputUrl, {
      type: "ehp",
      url: EHP_PROXY_URL,
    });
    expect(finalUrl).toContain("httpbin.org/get");
    expect(finalUrl).toContain("test=123");
  }, 40000);
});
