import { type PrecacheEntry, Serwist } from "serwist"

declare const self: any

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
})

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event: any) => {
  event.waitUntil(self.clients.claim())
})

serwist.addEventListeners()
