import axios from "axios";
import * as cheerio from "cheerio";
import { sendSysErrorMessage } from "../../sysErrorEmbed.js";
import { fileURLToPath } from "url";
import path from "path";

const TIMEOUT = 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fetch HTML of the page
async function fetchPageHTML(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      },
    });
    return data;
  } catch (error) {
    console.error(`[ERROR] Failed to fetch page HTML for: ${url}\n`, error);
    sendSysErrorMessage(__filename, `- Failed to fetch page HTML for: ${url}`);
    return null;
  }
}

// Get OG image (just return raw URL)
export async function getOpenGraphImage(url) {
  try {
    const html = await fetchPageHTML(url);
    if (!html) return null;

    const $ = cheerio.load(html);
    const ogImage =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[property="og:image:secure_url"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;

    return ogImage;
  } catch (error) {
    console.error(`[ERROR] getOpenGraphImage failed for: ${url}\n`, error);
    sendSysErrorMessage(__filename, `- getOpenGraphImage failed for: ${url}`);
    return null;
  }
}
