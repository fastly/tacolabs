/// <reference types="@fastly/js-compute" />

const handler = async (event) => {
  // get the request from the client
  const req = event.request
 
  const backendResponse = await fetch(req, {
    backend: "vcl-origin",
    cacheOverride: new CacheOverride("pass")
  });
 
  // Add headers to the response back to the client
  backendResponse.headers.append("x-tacos", "We love tacos!")
 
  // send the backend response to the client
  return backendResponse;
 }
 
 addEventListener("fetch", event => event.respondWith(handler(event)));
