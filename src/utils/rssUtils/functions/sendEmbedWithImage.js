import axios from "axios";
import fs from "fs/promises";
import path from "path";

export async function sendEmbedWithImage(channel, embed, imageUrl) {
  try {
    const filename = path.basename(imageUrl.split("?")[0]);
    const filepath = path.join("./temp", filename);

    // Download the image
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    await fs.writeFile(filepath, response.data);

    // Send embed with attachment
    await channel.send({
      embeds: [embed.setImage(`attachment://${filename}`)],
      files: [{ attachment: filepath, name: filename }],
    });

    // Delete immediately after sending
    await fs.unlink(filepath);
  } catch (error) {
    console.error("[ERROR] Failed to send embed with image", error);
  }
}
