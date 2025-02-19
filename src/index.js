/// <reference types="@fastly/js-compute" />
import { Logger } from "fastly:logger";
import { includeBytes } from "fastly:experimental";
import { ConfigStore } from "fastly:config-store";

// Load static files as a Uint8Array at compile time.
// File path is relative to the root of the project, not this file
const notfoundPage = includeBytes("src/not-found.html") || new Uint8Array();
const robotsPage = includeBytes("src/robots.txt") || new Uint8Array();

const handler = async (event) => {
  // get the request from the client
  const req = event.request;
  const reqURL = new URL(req.url);
  const reqPath = reqURL.pathname;

  // Prepare logs
  const logger = new Logger("tacolog");
  logger.log(`Request: ${reqURL}`);
  logger.log(`User-Agent: ${req.headers.get("User-Agent")}`);

  // Check if there is a redirect for the URL requested. 
  // If there is, redirect the client.
  const config = new ConfigStore("redirects");
  const dest = config.get(reqPath);

  if (dest) {
    return new Response("", {
      status: 301,
      headers: { Location: String(dest) },
    });
  }

  // Fetch from backend
  let backendResponse;
  try {
    backendResponse = await fetch(req, {
      backend: "vcl-origin",
      cacheOverride: new CacheOverride("pass"),
    });
  } catch (error) {
    logger.log(`Backend fetch error: ${error}`);
    return new Response("Internal Server Error", { status: 500 });
  }

  // Handle 404s with a custom response
  if (backendResponse.status === 404) {
    return new Response(new Uint8Array(notfoundPage), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Return robots.txt with a custom response
  if (reqURL.pathname.endsWith("/robots.txt")) {
    return new Response(new Uint8Array(robotsPage), {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Clone backend response and modify headers before returning
  const modifiedResponse = new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: backendResponse.headers,
  });

  modifiedResponse.headers.append("x-tacos", "🌮🌮🌮");
  return modifiedResponse;
};

addEventListener("fetch", (event) => event.respondWith(handler(event)));