import z from "zod";
import { Request, Response } from 'express'
import { generateGoogleMapsUrls } from "../utils/helpers";
import { BrowserBatchHandler } from "../functions/common/browser-batch-handler";
import {scrapeLinks} from "../functions/scrape-links";
import {GmapsDetailsLeadInfoExtractor} from "../functions/gmap-details-lead-extractor";

export const POSTv2ScrapeSchema = z.object({
  query: z.string(),
  country: z.string(),
  states: z.array(z.object({
    name: z.string(),
    cities: z.array(z.string())
  }))
});
export type TPOSTv2ScrapeSchema = z.infer<typeof POSTv2ScrapeSchema>;

export const GMAPS_SCRAPE =  async (req: Request, res: Response) => {

  const requestBody = req.body;

  const parsedBody = POSTv2ScrapeSchema.safeParse(requestBody);

  if (!parsedBody.success) {
    res.status(400).json({ success: false, error: "Invalid query parameters" });
    return;
  }

  const finalScrappingUrls = generateGoogleMapsUrls(parsedBody.data);

  if (finalScrappingUrls.length === 0) {
    res.status(400).json({ success: false, error: "No URLs provided" });
    return;
  }

  const scrappedData = await BrowserBatchHandler(finalScrappingUrls, scrapeLinks);
  const allScrapingUrls = scrappedData.results.flat();
  const allLeads = await BrowserBatchHandler(allScrapingUrls, GmapsDetailsLeadInfoExtractor);

  res.status(200).json({
    success: true,
    data: {
      foundedLeads: scrappedData,
      foundedLeadsCount: scrappedData.results.flat(2).length,
      actualLeads: allLeads.results.flat(2),
      actualLeadsCount: allLeads.results.flat(2).length,
    }
  })
};