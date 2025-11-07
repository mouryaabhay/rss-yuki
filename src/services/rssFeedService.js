import Parser from "rss-parser";
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import config from "../configs/config.js";
const { EMBED_COLORS } = config;
const { RSS_FEED } = config;
import { getOpenGraphImage } from "../utils/rssUtils/functions/getOpenGraphImage.js";
import { sendEmbedWithImage } from "../utils/rssUtils/functions/sendEmbedWithImage.js";
import { loadTimestamps, saveTimestamps } from "../utils/rssUtils/logging/rssFeedTimestampsLogger.js";
import { sendSysErrorMessage } from "../utils/sysErrorEmbed.js";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class rssFeedService {
  constructor() {
    this.parser = new Parser(); // Initialize RSS parser
    this.feedTimestamps = new Map(); // Map to store last sent timestamps
    this.initTimestamps(); // Load saved timestamps
  }

  async initTimestamps() {
    this.feedTimestamps = await loadTimestamps();
  }

  async fetchAndProcessFeeds(channel, rssUrls) {
    if (!rssUrls || rssUrls.length === 0) {
      console.warn("[WARN] No RSS feed URLs provided");
      return channel.send("No RSS feed URLs provided.");
    }

    let anyNewFeedSent = false;

    const enabledUrls = rssUrls.filter((feed) => feed.enabled);

    for (const { articleType, url } of enabledUrls) {
      if (!url) continue;

      try {
        const lastSentTimestamp = this.feedTimestamps.get(url) || new Date(0);
        const feed = await this.parser.parseURL(url);

        const newFeedItems = this.filterNewFeedItems(feed.items, lastSentTimestamp);

        for (const item of newFeedItems) {
          await this.processAndSendFeedItem(channel, item, url, articleType);
          anyNewFeedSent = true;
        }

        if (newFeedItems.length > 0) {
          this.feedTimestamps.set(url, newFeedItems[0].pubDate);
        }

        this.logFeedFetchStatus(newFeedItems, articleType);
      } catch (error) {
        this.logFeedFetchError(articleType, url, error);
      }
    }

    if (anyNewFeedSent) {
      await saveTimestamps(this.feedTimestamps);
    }
  }

  filterNewFeedItems(items, lastSentTimestamp) {
    return items
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .filter((item) => new Date(item.pubDate) > new Date(lastSentTimestamp))
      .slice(0, RSS_FEED.MAX_FEED_COUNT);
  }

  async processAndSendFeedItem(channel, item, url, articleType) {
    try {
      const ogImage = await getOpenGraphImage(item.link);

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.PRIMARY)
        .setTitle(item.title)
        .setURL(item.link)
        .setDescription(`> ${item.contentSnippet}` || "> No description available.")
        .addFields(
          {
            name: "Article Type",
            value: `> ${articleType}`,
            inline: true,
          },
          {
            name: "Categories",
            value: item.categories?.length
              ? `> ${item.categories.join(", ")}`
              : "No categories available",
            inline: true,
          }
        )
        .setTimestamp(new Date(item.pubDate));

      const button = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Read Article")
        .setURL(item.link);

      const actionRow = new ActionRowBuilder().addComponents(button);

      if (ogImage) {
        // Use helper to download, attach, and delete image
        await sendEmbedWithImage(channel, embed, ogImage, actionRow);
      } else {
        await channel.send({ embeds: [embed], components: [actionRow] });
      }

      this.feedTimestamps.set(url, item.pubDate);
      console.info(`[INFO] New ${articleType} feed sent: ${item.title}`);
    } catch (error) {
      console.error(`[ERROR] Failed to process feed item: ${item.link}`, error);
      sendSysErrorMessage(
        __filename,
        `- Failed to process feed item: ${item.link}`
      );
    }
  }

  logFeedFetchStatus(newFeedItems, articleType) {
    if (newFeedItems.length === 0) {
      console.log(`[INFO] No new feeds found for ${articleType} Article.`);
    }
  }

  logFeedFetchError(articleType, url, error) {
    console.error(`[ERROR] Failed to fetch RSS feed:\n RSS URL: ${url}\n`, error);
    sendSysErrorMessage(
      __filename,
      `There was an error fetching the RSS feed:\n- Article Type: ${articleType}\n- RSS URL: ${url}\n`
    );
  }
}

export default new rssFeedService();
