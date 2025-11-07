import axios from "axios";
import * as cheerio from "cheerio";
import { sendSysErrorMessage } from "../../sysErrorEmbed.js";
import { fileURLToPath } from "url";
import path from "path";

const TIMEOUT = 10000; // 10 seconds timeout

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to extract the image path from a given URL
async function extractImagePath(url) {
  try {
    const parsedUrl = new URL(url); // Parse the URL
    const pathParts = parsedUrl.pathname.split("/"); // Split the pathname into parts
    const thumbnailIndex = pathParts.indexOf("thumbnails"); // Find the index of 'thumbnails'

    // If 'thumbnails' not found or not enough parts
    if (thumbnailIndex === -1 || pathParts.length < thumbnailIndex + 3) {
      return null; // Return null if the structure is not as expected
    }

    // Extract path after crop dimensions
    return pathParts.slice(thumbnailIndex + 2).join("/");
  } catch (error) {
    console.error(`[ERROR]  Error extracting image path from: ${url}\n`, error);
    sendSysErrorMessage(
      __filename,
      `- Error extracting image path from: ${url}`
    );
    return null; // Return null in case of an error
  }
}

// Function to fetch Open Graph data from a given URL
async function fetchOpenGraphData(url) {
  try {
    const { data } = await axios.get(url, { timeout: TIMEOUT });
    return data; // Return the response data
  } catch (error) {
    console.error(`[ERROR]  Error fetching OpenGraph data for: ${url}\n`, error);
    sendSysErrorMessage(
      __filename,
      `- Failed to fetch OpenGraph data for: ${url}`
    );
    throw new Error(`Failed to fetch OpenGraph data: ${error.message}`);
  }
}

// Function to validate the constructed image URL
async function validateImageUrl(imageUrl, fallbackUrl) {
  try {
    new URL(imageUrl); // Will throw if invalid URL

    const response = await axios.head(imageUrl, { timeout: TIMEOUT });
    if (response.status === 200) {
      return imageUrl; // Return if image exists
    } else {
      console.error(`[ERROR]  Image not found at: ${imageUrl}`);
      return fallbackUrl; // Return fallback if image missing
    }
  } catch (error) {
    console.error(`[ERROR]  Invalid URL constructed: ${imageUrl}\n`, error);
    sendSysErrorMessage(
      __filename,
      `- Invalid Media URL constructed: ${imageUrl}\n- Original Media URL: ${fallbackUrl}`
    );
    return fallbackUrl; // Return fallback if validation fails
  }
}

// Function to get the Open Graph image from a given URL
export async function getOpenGraphImage(url) {
  try {
    const data = await fetchOpenGraphData(url);
    const $ = cheerio.load(data);
    const ogImage = $('meta[property="og:image"]').attr("content");

    if (ogImage) {
      const imagePath = await extractImagePath(ogImage);

      if (imagePath) {
        const newImageUrl = `https://www.animenewsnetwork.com/thumbnails/cover400x200/${imagePath}`;
        return await validateImageUrl(newImageUrl, ogImage);
      }
    }

    return null;
  } catch (error) {
    console.error(`[ERROR]  Error in getOpenGraphImage for: ${url}\n`, error);
    sendSysErrorMessage(
      __filename,
      `- Error in getOpenGraphImage for: ${url}`
    );
    return null;
  }
}
