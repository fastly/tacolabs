/// <reference types="@fastly/js-compute" />

const handler = async (event) => {
  // get the request from the client
  const req = event.request
 
  const backendResponse = await fetch(req, {
    backend: "vcl-origin",
    cacheOverride: new CacheOverride("pass")
  });
 
  // Handle 404s with a custom response
  if (backendResponse.status == 404) {
    return new Response("This is our custom Compute 404 page", {
      status: 404,
    });
  }
 
  // If status is not 404, send the backend response to the client
  if (backendResponse.status != 404) {
    // Create a new headers object to avoid modifying the original
    const newHeaders = new Headers(backendResponse.headers);
    newHeaders.set("x-tacos", "We love tacos!");
    
    // Create new response with the modified headers
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: newHeaders
    });
  }
}
 
 addEventListener("fetch", event => event.respondWith(handler(event)));
