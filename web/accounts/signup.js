const form = document.getElementById("signup-form");

const nameInp = document.getElementById("username-input");
const passInp = document.getElementById("password-input");
const repPassInp = document.getElementById("repeat-password-input");

const errorMsgP = document.getElementById("error-messages-tmp");

function validateForm() {
    let errors = [];
    if (nameInp.length === 0) {
        errors.push("Enter a username");
    } else if (nameInp.value.length < 5) {
        errors.push("Username must be at least 5 characters long");
    } else if (18 < nameInp.value.length) {
        errors.push("Username must be at most 18 characters long");
    } else if (nameInp.value.test(/[^a-zA-Z0-9_]/)) {
        errors.push(
            "Username cannot contain any fancy shmancy characters and that, stick to letters and numbers and underscores"
        );
    }

    if (passInp.value.length < 8) {
        errors.push("Password must be at least 8 characters long");
    } else if (20 < passInp.value.length) {
        errors.push("Password must be at most 20 characters long");
    }

    errorMsgP.innerHTML = errors.join("<br>");

    return !errors.length; // Returns true if there are no errors
}

form.addEventListener("submit", (event) => {
    if (!validateForm()) {
        event.preventDefault();
    }
});
