const form = document.getElementById("signup-form");

const nameInp = document.getElementById("username-input");
const passInp = document.getElementById("password-input");
const repPassInp = document.getElementById("repeat-password-input");

const errorMsgP = document.getElementById("error-messages-tmp");

function validateForm() {
    // TODO: fix  this terrible error handling system when it all works along with the aesthetic part
    let errors = [];

    if (nameInp.length === 0) {
        errors.push("Enter a username");
    } else if (nameInp.value.length < 5) {
        errors.push("Username must be at least 5 characters long");
    } else if (18 < nameInp.value.length) {
        errors.push("Username must be at most 18 characters long");
    } else if (/[^a-zA-Z0-9_]/.test(nameInp.value)) {
        errors.push(
            "Username cannot contain any fancy shmancy characters and that, stick to letters and numbers and underscores"
        );
    } else if (/^_|_$/.test(nameInp.value)) {
        errors.push("Username cannot begin or end with underscore");
    }

    if (passInp.value.length === 0) {
        errors.push("Enter a password");
    } else if (passInp.value.length < 8) {
        errors.push("Password must be at least 8 characters long");
    } else if (20 < passInp.value.length) {
        errors.push("Password must be at most 20 characters long");
    }

    if (passInp.value !== repPassInp.value) {
        errors.push("Passwords must match");
    }

    errorMsgP.innerHTML = errors.join("<br>");

    return !errors.length; // Returns true if there are no errors
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (validateForm()) {
        let response = await fetch("/account/signup", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                username: nameInp.value,
                password: passInp.value,
            }),
        });

        let body = await response.text();

        console.log(body);

        if (response.status === 200) {
            document.cookie = `sessionID=${body};expires=; path=/`;
            cookie.set
        }

        if (response.status === 400) {
            if (body === "username taken") {
                errorMsgP.innerHTML = "Username is taken, try another one.";
            }
        }
    }
});
