import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { POSTV1Scrape } from "./apis/POST-v1-scrape";
import { POSTV2Scrape } from "./apis/POST-v2-scrape";
dotenv.config();

export const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
}))
app.use(express.json())

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AixelLabs server is running... on port ${PORT}`);
});

app.get("/v1/ping", (_, res) => {
  res.send({ success: true, message: "Server is running" });
});

app.post("/v1/scrape", POSTV1Scrape)

app.post("/v2/scrape", POSTV2Scrape)


// const main = async () => {
//   const exampleUrls = [
//     "https://www.google.com/maps/search/pizza+restaurants+in+Pimpri,+Pune,+Maharashtra,+India/",
//     "https://www.google.com/maps/search/burger+restaurants+in+Pimpri,+Pune,+Maharashtra,+India/",
//     "https://www.google.com/maps/search/coffee+shops+in+Pimpri,+Pune,+Maharashtra,+India/",
//     "https://www.google.com/maps/search/ice+cream+in+Pimpri,+Pune,+Maharashtra,+India/",
//     "https://www.google.com/maps/search/bakeries+in+Pimpri,+Pune,+Maharashtra,+India/",
//     // "https://www.google.com/maps/search/chinese+restaurants+in+Pimpri,+Pune,+Maharashtra,+India/",
//     // "https://www.google.com/maps/search/south+indian+restaurants+in+Pimpri,+Pune,+Maharashtra,+India/",
//     // "https://www.google.com/maps/search/vegetarian+restaurants+in+Pimpri,+Pune,+Maharashtra,+India/",
//     // "https://www.google.com/maps/search/fine+dining+in+Pimpri,+Pune,+Maharashtra,+India/",
//     // "https://www.google.com/maps/search/dessert+shops+in+Pimpri,+Pune,+Maharashtra,+India/",
//   ];
//
//   const scrappedData = await parallelBrowsersInit(exampleUrls);
//
//   fs.writeFileSync('temp-data.json', JSON.stringify(scrappedData, null, 2));
//
//   console.log('---- FINAL OUTPUT ---', JSON.stringify(scrappedData, null, 2));
// }
//
// main().catch(error => {
//   console.error('Error in main', error);
//   process.exit(1);
// })