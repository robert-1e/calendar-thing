Deno.serve({
    port: 80,
    handler: async (request) => {
        if (request.headers.get("upgrade") === "websocket") {
            // Currently just code stolen from the internets
            // TODO: make it like actually do what it is supposed to do

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
        } else if (request.method === "POST") {
            try {
                let body = await request.text();

                console.log("body\n", body);

                let URLParams = new URLSearchParams(body).entries();

                console.log("URLParams\n", URLParams);

                let params = new Proxy(URLParams);

                console.log("params\n", params);
            } catch (error) {
                console.log("Invalid POST request");
            }

            return new Response();
        } else {
            const URLPath = new URL(request.url).pathname;

            let filePath;

            if (/^\/(signup|login)\/*$/.test(URLPath)) {
                filePath = `./web/accounts/${URLPath.match(/signup|login/i)}.html`;
            } else if (/^\/(signup|login)\.js$/.test(URLPath)) {
                filePath = "./web/accounts" + URLPath;
            } else {
                filePath = `./web${URLPath.match(/^[^&]*/)}`;

                if (!filePath.endsWith("/") && !/\.[^\/\.]+$/.test(filePath)) {
                    filePath += "/";
                }

                if (!/\.[^\/\.]+$/.test(filePath)) {
                    filePath += "index.html";
                }
            }

            let file;

            try {
                file = await Deno.open(filePath, { read: true });
            } catch (error) {
                file = await Deno.open("./web/404.html", { read: true });

                if (error.name !== "NotFound") {
                    console.log(error);
                }
            }

            return new Response(file.readable);
        }
    },
});
