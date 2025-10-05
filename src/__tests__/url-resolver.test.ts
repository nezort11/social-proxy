import path from "path";
import * as dotenv from "dotenv";
import { describe, it, expect } from "vitest";
import dns from "node:dns";
import { getFinalUrl } from "../url-resolver";

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
