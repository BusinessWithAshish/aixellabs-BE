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
  console.log("🚀 GMAPS_SCRAPE: Request received");
  console.log("📝 Request body:", JSON.stringify(req.body, null, 2));

  const requestBody = req.body;

  const parsedBody = GmapsScrapeSchema.safeParse(requestBody);

  if (!parsedBody.success) {
    console.log("❌ GMAPS_SCRAPE: Invalid query parameters", parsedBody.error);
    res.status(400).json({ success: false, error: "Invalid query parameters" });
    return;
  }

  console.log("✅ GMAPS_SCRAPE: Request validation passed");

  const finalScrappingUrls = generateGoogleMapsUrls(parsedBody.data);
  console.log("🔗 GMAPS_SCRAPE: Generated URLs count:", finalScrappingUrls.length);
  console.log("🔗 GMAPS_SCRAPE: First few URLs:", finalScrappingUrls.slice(0, 3));

  if (finalScrappingUrls.length === 0) {
    console.log("❌ GMAPS_SCRAPE: No URLs generated");
    res.status(400).json({ success: false, error: "No URLs provided" });
    return;
  }

  try {
    console.log("🌐 GMAPS_SCRAPE: Starting first batch (scrapeLinks)...");
    const foundedLeads = await BrowserBatchHandler(finalScrappingUrls, scrapeLinks);
    console.log("📊 GMAPS_SCRAPE: First batch results:", {
      success: foundedLeads.success,
      resultsCount: foundedLeads.results.length,
      errorsCount: foundedLeads.errors.length,
      successCount: foundedLeads.successCount,
      errorCount: foundedLeads.errorCount
    });
    
    const foundedLeadsResults = foundedLeads.results.flat();
    console.log("🔗 GMAPS_SCRAPE: Founded leads URLs count:", foundedLeadsResults.length);

    if (foundedLeadsResults.length === 0) {
      console.log("⚠️ GMAPS_SCRAPE: No leads found in first batch, returning empty results");
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

    console.log("🌐 GMAPS_SCRAPE: Starting second batch (GmapsDetailsLeadInfoExtractor)...");
    const allLeads = await BrowserBatchHandler(foundedLeadsResults, GmapsDetailsLeadInfoExtractor);
    console.log("📊 GMAPS_SCRAPE: Second batch results:", {
      success: allLeads.success,
      resultsCount: allLeads.results.length,
      errorsCount: allLeads.errors.length,
      successCount: allLeads.successCount,
      errorCount: allLeads.errorCount
    });
    
    const allLeadsResults = allLeads.results.flat();
    console.log("🎯 GMAPS_SCRAPE: Final leads count:", allLeadsResults.length);

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
    console.error("💥 GMAPS_SCRAPE: Critical error occurred:", error);
    res.status(500).json({ 
      success: false, 
      error: "Internal server error during scraping",
      details: error instanceof Error ? error.message : String(error)
    });
  }
};