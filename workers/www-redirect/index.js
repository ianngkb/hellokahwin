// Sends every request for www.hellokahwin.com to the apex, keeping path and query.
export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect("https://hellokahwin.com" + url.pathname + url.search, 301);
  },
};
