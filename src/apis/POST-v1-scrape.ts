import z from "zod";
import { Request, Response } from 'express'
import { generateGoogleMapsUrls } from "../utils/helpers";
import { GMAPS_SCRAPPER } from "../functions/gmaps-scrapper";

export const POSTv1ScrapeSchema = z.object({
  query: z.string(),
  country: z.string(),
  states: z.array(z.object({
    name: z.string(),
    cities: z.array(z.string())
  }))
});
export type TPOSTv1ScrapeSchema = z.infer<typeof POSTv1ScrapeSchema>;

export const POSTV1Scrape =  async (req: Request, res: Response) => {

  const requestBody = req.body;

  const parsedBody = POSTv1ScrapeSchema.safeParse(requestBody);

  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }

  const finalScrappingUrls = generateGoogleMapsUrls(parsedBody.data);

  if (finalScrappingUrls.length === 0) {
    res.status(400).json({ error: "No URLs provided" });
    return;
  }

  const scrappedData = await GMAPS_SCRAPPER(finalScrappingUrls);
  res.send({ success: scrappedData.success, data: scrappedData.results, ...(scrappedData.error && { error: scrappedData.error }) });
};