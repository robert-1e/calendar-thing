import crypto from "node:crypto";

// Use 256 for session ID
function oven(size) {
    return crypto.randomBytes(size).toString("hex");
}

/**
 * Hashes some data
 * @param {String} algorithm Hashing algorithm used
 * @param {String} data Data that is being hashed
 * @param {Number} digest Format that the returned hash is in
 * @returns Hashed data
 */
function hash(algorithm, data, digest = "hex") {
    return crypto.createHash(algorithm).update(data).digest(digest);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Makes a string that can be directly stored as a cookie on client
 * @param {String} name Name of cookie
 * @param {String} value Value of cookie
 * @param {Number} expiresIn Days until cookie expires
 * @returns String containing all cookie data
 */
function formatCookie(name, value, expiresIn) {
    const d = new Date();
    d.setTime(d.getTime() + expiresIn * 24 * 60 * 60 * 1000);
    return name + "=" + value + ";" + "expires=" + d.toUTCString() + ";path=/";
}

const kv = await Deno.openKv();

// Remove this next commit
(async () => {
    for await (const entry of kv.list({ prefix: ["userdata"] })) {
        await kv.delete(entry.key);
    }

    for await (const entry of kv.list({ prefix: ["cookie"] })) {
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
                        return new Response(formatCookie("sessionID", cookie, 30), {
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
