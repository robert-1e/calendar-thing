const canvas = document.getElementById("background-anim");

const ctx = canvas.getContext("2d", { willReadFrequently: true });

const aVariableICbaToName = 100;

function sumSine(x, y, xArr, yArr, time, scale = 1 / 150) {
    let total = 0;

    for (let n = 0; n < xArr.length; n++) {
        total += Math.sin(scale * xArr[n] * x - ((n + 1) * time) / 20);
    }

    for (let n = 0; n < yArr.length; n++) {
        total += Math.sin(scale * yArr[n] * y - ((n + 1) * time) / 20);
    }

    return total;
}

const yArr = [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];
const xArr = [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];

let prevTime = 0;
let deltaTime = 0;

function animate(currTime) {
    deltaTime = currTime - prevTime;

    console.log(deltaTime);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ff00ff";

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = new Uint8Array(image.data.buffer);

    for (let i = 3; i < data.length; i += 4) {
        let x = (i % (canvas.width * 4)) * aVariableICbaToName;
        let y = Math.floor(i / (canvas.height * 4)) * aVariableICbaToName;

        let sineSum = sumSine(x, y, xArr, yArr, currTime / 100);
        let v = sineSum * sineSum * 6;

        if (v < 255) {
            data[i - 3] = v;
        } else if (255 < v) {
            data[i - 1] = 510 - v;
        } else {
            // this hopefully wont happen, if it does then call it a feature
        }

        // data[i] = v;
    }

    ctx.putImageData(image, 0, 0);

    prevTime = currTime;

    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
