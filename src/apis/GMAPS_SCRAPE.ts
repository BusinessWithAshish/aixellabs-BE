import z from "zod";
import { Request, Response } from 'express'
import { generateGoogleMapsUrls } from "../utils/helpers";
import { BrowserBatchHandler } from "../functions/common/browser-batch-handler";
import {scrapeLinks} from "../functions/scrape-links";
import {GmapsDetailsLeadInfoExtractor} from "../functions/gmap-details-lead-extractor";

export const GmapsScrapeSchema = z.object({
  query: z.string(),
  country: z.string(),
  states: z.array(z.object({
    name: z.string(),
    cities: z.array(z.string())
  }))
});

export type GmapsScrape = z.infer<typeof GmapsScrapeSchema>;

export const GMAPS_SCRAPE =  async (req: Request, res: Response) => {
  const requestBody = req.body;

  const parsedBody = GmapsScrapeSchema.safeParse(requestBody);

  if (!parsedBody.success) {
    res.status(400).json({ success: false, error: "Invalid query parameters" });
    return;
  }

  const finalScrappingUrls = generateGoogleMapsUrls(parsedBody.data);

  if (finalScrappingUrls.length === 0) {
    res.status(400).json({ success: false, error: "No URLs provided" });
    return;
  }

  try {
    const foundedLeads = await BrowserBatchHandler(finalScrappingUrls, scrapeLinks);
    
    const foundedLeadsResults = foundedLeads.results.flat();
    if (foundedLeadsResults.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          founded: foundedLeadsResults,
          foundedLeadsCount: foundedLeadsResults.length,
          allLeads: [],
          allLeadsCount: 0
        }
      });
      return;
    }

    const allLeads = await BrowserBatchHandler(foundedLeadsResults, GmapsDetailsLeadInfoExtractor);
    const allLeadsResults = allLeads.results.flat();
    res.status(200).json({
      success: true,
      data: {
        founded: foundedLeadsResults,
        foundedLeadsCount: foundedLeadsResults.length,
        allLeads: allLeadsResults,
        allLeadsCount: allLeadsResults.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false, 
      error: "Internal server error during scraping",
      details: error instanceof Error ? error.message : String(error)
    });
  }
};