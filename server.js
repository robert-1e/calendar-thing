const kv = await Deno.openKv();

kv.set(["userdata"], {});

Deno.serve({
    port: 80,
    handler: async (request) => {
        try {
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
                    switch (new URL(request.url).pathname) {
                        case "/signup/new-account":
                            let accInfo = JSON.parse(await request.text());

                            console.log(accInfo);

                            // Validating info server-side (as well as client side)
                            if (
                                accInfo.username.length < 5 ||
                                18 < accInfo.username.length ||
                                accInfo.password.length < 8 ||
                                20 < accInfo.password.length ||
                                /[^a-zA-Z0-9_]/.test(accInfo.username) ||
                                /^_|_$/.test(accInfo.username)
                            ) {
                                // Invalid info (deal with it somehow)
                                console.log(
                                    "FIX ME!1!!!1\n(if this is still WIP)\n[FOR DEBUGGING PURPOSES]"
                                );

                                return new Response("invalid account creation data", {
                                    status: 400,
                                    headers: { "content-type": "text/html" },
                                });
                            }

                            if (kv.get(["userdata", accInfo.username])) {
                                console.log(kv.get(["userdata", accInfo.username]));
                            }

                            break;

                        default:
                            console.log("Unknown POST request\n", request);

                            return new Response(/* TODO: write this bit */);
                    }
                } catch (error) {
                    console.log("Error in POST req handling\n", error);
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
        } catch (_) {
            new Response({
                status: 500,
            });
        }
    },
});
