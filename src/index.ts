import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {GMAPS_SCRAPE} from "./apis/GMAPS_SCRAPE";
import {GMAPS_SEARCH_API_SCRAPE} from "./apis/GMAPS_SEARCH_API_SCRAPE";

dotenv.config();

export const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
}))
app.use(express.json())

const PORT = process.env.PORT || 8100;

app.listen(PORT, () => {
  console.log(`AixelLabs server is running... on port ${PORT}`);
});

app.get("/v1/ping", (_, res) => {
  res.send({ success: true, message: "Server is running" });
});

app.post("/gmaps/scrape", GMAPS_SCRAPE)

app.post("/gmaps/search_scrape", GMAPS_SEARCH_API_SCRAPE)