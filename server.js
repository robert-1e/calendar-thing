import { serveDir } from "jsr:@std/http/file-server";

Deno.serve(async (req) => {
    let path = new URL(req.url).pathname;

    console.log(path);

    if (path === "/data/") {
        return new Response(Date.now());
    }

    return serveDir(req);
});
