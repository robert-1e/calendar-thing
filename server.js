const crypto = require("crypto");

function generateCookie() {
    return crypto.randomBytes(32).toString("hex");
}

const kv = await Deno.openKv();

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
                const URLPath = new URL(request.url).pathname;

                if (/^\/account\/(login|signup)$/.test(URLPath)) {
                    let accInfo = JSON.parse(await request.text());

                    let userdata = await kv.get(["userdata", accInfo.username]);

                    if (
                        accInfo.username.length < 5 ||
                        18 < accInfo.username.length ||
                        accInfo.password.length < 8 ||
                        20 < accInfo.password.length ||
                        /[^a-zA-Z0-9_]/.test(accInfo.username) ||
                        /^_|_$/.test(accInfo.username)
                    ) {
                        // Invalid info

                        return new Response("invalid account creation data", {
                            status: 400,
                            headers: { "content-type": "text/html" },
                        });
                    } else if (
                        /login/.test(URLPath) &&
                        userdata.value.password === accInfo.password
                    ) {
                        return new Response(JSON.stringify(), {
                            status: 200,
                            headers: { "content-type": "application/json" },
                        });
                    } else if (/signup/.test(URLPath) && userdata.value) {
                        console.log(userdata);

                        return new Response("username taken", {
                            status: 400,
                            headers: { "content-type": "text/html" },
                        });
                    }
                }

                switch (new URL(request.url).pathname) {
                    case "/signup/new-account":
                        accInfo = JSON.parse(await request.text());

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
                        } else if ((await kv.get(["userdata", accInfo.username])).value) {
                            console.log(await kv.get(["userdata", accInfo.username]));

                            return new Response("username taken", {
                                status: 400,
                                headers: { "content-type": "text/html" },
                            });
                        }

                        kv.set(["userdata", accInfo.username], {
                            password: accInfo.password,
                        });

                        let cookie = generateCookie();

                        break;

                    case "/login/login":
                        accInfo = JSON.parse(await request.text());

                        console.log(accInfo);

                        // Validating info server-side (as well as client side)
                        if (
                            accInfo.username.length < 5 ||
                            18 < accInfo.username.length ||
                            accInfo.password.length < 8 ||
                            20 < accInfo.password.length ||
                            /[^a-zA-Z0-9_]/.test(accInfo.username) ||
                            /^_|_$/.test(accInfo.username) ||
                            !(
                                (await kv.get(["userdata", accInfo.username])).value.password ===
                                accInfo.password
                            )
                        ) {
                            // Invalid info (deal with it somehow)
                            return new Response("invalid account data", {
                                status: 400,
                                headers: { "content-type": "text/html" },
                            });
                        }

                        // TODO: make this work
                        return new Response(
                            "you logged in successfully!! (login system not fully implemented yet so this means nothing)",
                            {
                                status: 200,
                                headers: { "content-type": "text/html" },
                            }
                        );

                    default:
                        console.log("Unknown POST request\n", request);

                        return new Response(/* TODO: write this bit */);
                }

                return new Response(/* TODO: write this bit */);
            } else if (request.method === "GET") {
                console.log(request);

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
            } else {
                return new Response("", {
                    status: 405,
                    headers: { "content-type": "text/html" },
                });
            }
        } catch (_) {
            new Response({
                status: 500,
            });
        }
    },
});
