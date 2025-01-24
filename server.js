import crypto from "node:crypto";

// Use 256 for session ID
function oven(size) {
    return crypto.randomBytes(size).toString("hex");
}

// ("sha512", ..., "hex")
function hash(algorithm, data, digest = "hex") {
    return crypto.createHash(algorithm).update(data).digest(digest);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const kv = await Deno.openKv();

// Remove this next commit
(async () => {
    for await (const entry of kv.list({ prefix: ["cookie"] })) {
        await kv.delete(entry.key);
    }

    for await (const entry of kv.list({ prefix: ["userdata"] })) {
        await kv.delete(entry.key);
    }
})();

// Because I'm too lazy for a better solution
let dealingWithPOST = false;

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
                while (dealingWithPOST) {
                    sleep(100);
                }

                dealingWithPOST = true;
                const URLPath = new URL(request.url).pathname;

                let accInfo, userdata;

                if (/^\/account\/(login|signup)$/.test(URLPath)) {
                    accInfo = JSON.parse(await request.text());

                    userdata = await kv.get(["userdata", accInfo.username]);

                    if (!userdata) {
                        dealingWithPOST = false;
                        return new Response("invalid account creation data", {
                            status: 400,
                            headers: { "content-type": "text/html" },
                        });
                    }

                    if (
                        accInfo.username.length < 5 ||
                        18 < accInfo.username.length ||
                        accInfo.password.length < 8 ||
                        20 < accInfo.password.length ||
                        /[^a-zA-Z0-9_]/.test(accInfo.username) ||
                        /^_|_$/.test(accInfo.username)
                    ) {
                        // Invalid info
                        dealingWithPOST = false;
                        return new Response("invalid account creation data", {
                            status: 400,
                            headers: { "content-type": "text/html" },
                        });
                    } else if (
                        /login/.test(URLPath) &&
                        userdata.value.password === hash("sha512", accInfo.password)
                    ) {
                        dealingWithPOST = false;
                        return new Response(JSON.stringify(userdata), {
                            status: 200,
                            headers: { "content-type": "application/json" },
                        });
                    } else if (/signup/.test(URLPath)) {
                        if (userdata.value) {
                            dealingWithPOST = false;
                            return new Response("username taken", {
                                status: 400,
                                headers: { "content-type": "text/html" },
                            });
                        }

                        // Successful Signup
                        let res = await kv.set(["userdata", accInfo.username], {
                            password: hash("sha512", accInfo.password),
                        });

                        console.log(`Hash: ${hash("sha512", accInfo.password)}\nRes: `, res);

                        let cookie = oven(256);

                        while ((await kv.get(["cookie", cookie])).value) {
                            cookie = oven(256);
                        }

                        res = await kv.set(["cookie", cookie], {
                            username: accInfo.username,
                            expires: "",
                        });

                        console.log(`Cookie: ${cookie}\nRes: `, res);

                        dealingWithPOST = false;
                        return new Response(cookie, {
                            status: 200,
                            headers: { "content-type": "text/html" },
                        });
                    }
                }

                dealingWithPOST = false;
                return new Response(/* TODO: write this bit */);
            } else if (request.method === "GET") {
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
        } catch ({ name, message }) {
            if (request.method === "POST") dealingWithPOST = false;
            return new Response(name + message, {
                status: 500,
            });
        }
    },
});
