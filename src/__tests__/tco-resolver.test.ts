import path from "path";
import * as dotenv from "dotenv";
import { describe, it, expect } from "vitest";
import dns from "node:dns";
import { getFinalUrl } from "../url-resolver";
import { normalizeTextTcoResolvedLinks } from "../publish-utils";

dotenv.config({ path: path.join(process.cwd(), "./env/.env") });
dns.setDefaultResultOrder("ipv4first");

const PROXY_URL = process.env.PROXY_URL;

describe("t.co resolution", () => {
  it("resolves a real t.co link via proxy (no mocking)", async () => {
    if (!PROXY_URL) {
      throw new Error("PROXY_URL is not defined in env/.env");
    }

    // Example t.co link pattern. Replace with a simple redirect link from t.co domain that works generally
    const tco = "https://t.co/wF1D5lilnW"; // from user request
    const finalUrl = await getFinalUrl(tco, PROXY_URL);
    const u = new URL(finalUrl);

    expect(u.hostname.length).toBeGreaterThan(0);
    expect(["http:", "https:"]).toContain(u.protocol);
  });
});

describe("normalizeTextTcoResolvedLinks", () => {
  it("replaces a single t.co link in text", async () => {
    const input = "Check this out https://t.co/wF1D5lilnW now";
    const output = await normalizeTextTcoResolvedLinks(input);
    expect(output).not.toContain("https://t.co/wF1D5lilnW");

    const matches = output.match(/https?:\/\/[\w.-]+\.[a-z]{2,}[^\s]*/i);
    expect(matches).toBeTruthy();
  });

  it("replaces multiple t.co links in text", async () => {
    const input =
      "First https://t.co/wF1D5lilnW and second https://t.co/wF1D5lilnW";
    const output = await normalizeTextTcoResolvedLinks(input);
    console.log(output);
    expect(output).not.toContain("https://t.co/wF1D5lilnW");
  });

  it("returns unchanged text if no t.co links present", async () => {
    const input = "No short links here";
    const output = await normalizeTextTcoResolvedLinks(input);
    console.log(output);
    expect(output).toBe(input);
  });
});
