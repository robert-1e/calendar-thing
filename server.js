Deno.serve({
    port: 80,
    handler: async (request) => {
        if (request.headers.get("upgrade") === "websocket") {
            const { socket, response } = Deno.upgradeWebSocket(request);

            socket.onopen = () => {
                console.log("CONNECTED");
            };
            socket.onmessage = (event) => {
                console.log(`RECEIVED: ${event.data}`);
                socket.send("pong");
            };
            socket.onclose = () => {
                console.log("DISCONNECTED");
            };
            socket.onerror = (error) => {
                console.error("ERROR:", error);
            };

            return response;
        } else {
            const URLPath = new URL(request.url).pathname;

            let filePath;

            if (URLPath === "/signup") {
                filePath = "./web/accounts/signup.html";
            } else if (URLPath === "/login") {
                filePath = "./web/accounts/login.html";
            } else {
                filePath = `./web${URLPath.match(/^[^&]*/)}`; // Thank you to https://regexr.com and https://chatgpt.com for this regex

                if (!filePath.endsWith("/") && !filePath.endsWith(".html")) {
                    filePath += "/";
                }

                if (!filePath.endsWith(".html")) {
                    filePath += "index.html";
                }
            }

            let file;

            try {
                file = await Deno.open(filePath, { read: true });
            } catch (error) {
                console.log(error);

                file = await Deno.open("./web/404.html", { read: true });
            }

            return new Response(file.readable);
        }
    },
});
