import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts", // Path to service worker source
  swDest: "public/sw.js", // Compiled service worker destination
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // Disable SW in dev mode
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSerwist(nextConfig);
