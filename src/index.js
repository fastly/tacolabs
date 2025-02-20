/// <reference types="@fastly/js-compute" />
import { Logger } from "fastly:logger";
import { includeBytes } from "fastly:experimental";
import { ConfigStore } from "fastly:config-store";
import { CacheOverride } from "fastly:cache-override";

// Load static files as a Uint8Array at compile time.
// File path is relative to root of project, not to this file
const notfoundPage = includeBytes("./src/not-found.html");
const robotsPage = includeBytes("./src/robots.txt");

const handler = async (event) => {
  try {
    // get the request from the client
    const req = event.request;
    const reqURL = new URL(req.url);
    const reqPath = reqURL.pathname;

    // Prepare logs
    const logger = new Logger("tacolog");
    logger.log('Request: ' + reqURL.toString());
    logger.log('User-Agent: ' + (req.headers.get('User-Agent') || ''));

    // Check if there is a redirect for the URL requested. 
    // If there is, redirect the client.
    try {
      const config = new ConfigStore('redirects');
      const destBytes = config.get(reqPath);
      
      if (destBytes) {
        // Convert the byte string to a JavaScript string
        const textDecoder = new TextDecoder();
        const dest = textDecoder.decode(destBytes);
        
        return new Response("", {
          status: 301,
          headers: { Location: dest },
        });
      }
    } catch (configError) {
      logger.log('ConfigStore error: ' + configError.message);
      // Continue with the request even if config fails
    }

    // Use the correct CacheOverride import
    const backendResponse = await fetch(req, {
      backend: "vcl-origin",
      cacheOverride: new CacheOverride("pass")
    });

    // Handle 404s with a custom response
    if (backendResponse.status == 404) {
      return new Response(notfoundPage, {
        status: 404,
        headers: {
          "Content-Type": "text/html"
        }
      });
    }

    // Return robots.txt with a custom response
    if (reqPath.endsWith("/robots.txt")) {
      return new Response(robotsPage, {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }

    // If status is not 404, send the backend response to the client
    if (backendResponse.status != 404) {
      // Create a new response to safely modify headers
      const clonedResponse = new Response(backendResponse.body, backendResponse);
      clonedResponse.headers.append("x-tacos", "🌮🌮🌮");
      return clonedResponse;
    }
    
    // Fallback response if none of the conditions above are met
    return backendResponse;
  } catch (error) {
    // Add error handling to get better debug info
    const logger = new Logger("tacolog");
    logger.log('Error: ' + error.message);
    return new Response("Internal Server Error", { status: 500 });
  }
}

addEventListener("fetch", event => event.respondWith(handler(event)));