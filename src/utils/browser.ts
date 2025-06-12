import { LaunchOptions } from "puppeteer-core";
import { config } from "dotenv";
config();

export const optimisedBrowserArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-web-security',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-default-apps',
  '--disable-extensions',
  '--start-maximized',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-dev-tools',
];

export const getBrowserOptions = async (): Promise<LaunchOptions> => {

  return {
    channel: 'chrome',
    headless: false,
    defaultViewport: null,
    args: [...optimisedBrowserArgs],
  }

};