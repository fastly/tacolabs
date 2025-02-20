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
  // get the request from the client
  const req = event.request;
  const reqURL = new URL(req.url);
  const reqPath = reqURL.pathname;

  // Prepare logs
  const logger = new Logger("tacolog");
  logger.log('Request: ' + reqURL);
  logger.log('User-Agent: ' + req.headers.get('User-Agent'));

  // Check if there is a redirect for the URL requested
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
  } catch (error) {
    logger.log('ConfigStore error: ' + error.message);
    // Continue with request if ConfigStore fails
  }

  const backendResponse = await fetch(req, {
    backend: "vcl-origin", 
    cacheOverride: new CacheOverride("pass")
  });

  // Handle 404s with a custom response
  if (backendResponse.status == 404) {
    return new Response(notfoundPage, {
      status: 404,
    });
  }

  // Return robots.txt with a custom response
  if (reqURL.pathname.endsWith("/robots.txt")) {
    return new Response(robotsPage, {
      status: 200,
    });
  }

  // If status is not 404, send the backend response to the client
  if (backendResponse.status != 404) {
    // Create a new headers object to avoid modifying the original
    const newHeaders = new Headers(backendResponse.headers);
    newHeaders.set("x-tacos", encodeURIComponent("🌮🌮🌮"));
    
    // Create new response with the modified headers
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: newHeaders
    });
  }
  
  // Default return if we somehow get here
  return backendResponse;
}

addEventListener("fetch", event => event.respondWith(handler(event)));