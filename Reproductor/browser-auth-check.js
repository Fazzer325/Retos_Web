const fs = require("node:fs");

const DEBUG_PORT = 9224;
const APP_URL = "http://127.0.0.1:4176/";
const SCREENSHOT_PATH = "./session-check.png";
const MOBILE_SCREENSHOT_PATH = "./mobile-check.png";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitFor(check, message, timeout = 8000) {
    const startedAt = Date.now();
    let lastError;

    while (Date.now() - startedAt < timeout) {
        try {
            const result = await check();
            if (result) return result;
        } catch (error) {
            lastError = error;
        }
        await delay(100);
    }

    throw new Error(`${message}${lastError ? `: ${lastError.message}` : ""}`);
}

async function run() {
    const target = await waitFor(async () => {
        const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
        const targets = await response.json();
        return targets.find((item) => item.type === "page" && item.url === APP_URL);
    }, "Chrome no abrió el reproductor");

    const socket = new WebSocket(target.webSocketDebuggerUrl);
    const pending = new Map();
    let nextId = 1;

    await new Promise((resolve, reject) => {
        socket.addEventListener("open", resolve, { once: true });
        socket.addEventListener("error", reject, { once: true });
    });

    socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (!message.id || !pending.has(message.id)) return;
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
    });

    function send(method, params = {}) {
        const id = nextId++;
        socket.send(JSON.stringify({ id, method, params }));
        return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    }

    async function evaluate(expression) {
        const result = await send("Runtime.evaluate", {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
    }

    await send("Runtime.enable");
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
    });

    await waitFor(
        () => evaluate("document.readyState === 'complete' && !document.querySelector('#VistaAcceso').hidden && document.querySelector('#PlayerApp').hidden"),
        "La pantalla de acceso no apareció"
    );

    await evaluate(`(() => {
        document.querySelector('#NombreAcceso').value = 'Luna Rivera';
        document.querySelector('#CorreoAcceso').value = 'LUNA@EXAMPLE.COM';
        document.querySelector('#RecordarAcceso').checked = true;
        document.querySelector('#FormularioAcceso').requestSubmit();
        return true;
    })()`);

    await waitFor(
        () => evaluate("!document.querySelector('#PlayerApp').hidden"),
        "El reproductor no se abrió"
    );

    const firstSession = await evaluate(`({
        name: document.querySelector('#NombreUsuario').textContent,
        email: document.querySelector('#CorreoUsuario').textContent,
        hasCookie: document.cookie.includes('air_player_session=')
    })`);

    if (
        firstSession.name !== "Luna Rivera" ||
        firstSession.email !== "luna@example.com" ||
        !firstSession.hasCookie
    ) {
        throw new Error(`Sesión inicial inesperada: ${JSON.stringify(firstSession)}`);
    }

    const savedPreferences = await evaluate(`(() => {
        document.querySelector('[data-action="favorite"]').click();
        const volume = document.querySelector('#ControlVolumen');
        volume.value = '34';
        volume.dispatchEvent(new Event('input', { bubbles: true }));
        const session = window.AirPlayerAuth.getActiveSession();
        const favoriteKey = window.AirPlayerAuth.buildUserStorageKey('air-player-favoritos', session);
        const volumeKey = window.AirPlayerAuth.buildUserStorageKey('air-player-volumen', session);
        return {
            favorites: localStorage.getItem(favoriteKey),
            volume: localStorage.getItem(volumeKey)
        };
    })()`);

    if (savedPreferences.favorites !== "[0]" || savedPreferences.volume !== "0.34") {
        throw new Error(`Preferencias no guardadas por cuenta: ${JSON.stringify(savedPreferences)}`);
    }

    await send("Page.reload", { ignoreCache: true });
    await waitFor(
        () => evaluate("document.readyState === 'complete' && !document.querySelector('#PlayerApp').hidden && document.querySelector('#NombreUsuario').textContent === 'Luna Rivera'"),
        "La sesión no se restauró después de recargar"
    );

    const restoredPreferences = await evaluate(`({
        favorite: document.querySelector('[data-action="favorite"]').getAttribute('aria-pressed'),
        volume: document.querySelector('#ControlVolumen').value
    })`);
    if (restoredPreferences.favorite !== "true" || restoredPreferences.volume !== "34") {
        throw new Error(`Preferencias no restauradas: ${JSON.stringify(restoredPreferences)}`);
    }

    const screenshot = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false
    });
    fs.writeFileSync(SCREENSHOT_PATH, Buffer.from(screenshot.data, "base64"));

    await evaluate("document.querySelector('#CerrarSesion').click()");
    const logoutState = await evaluate(`({
        loginVisible: !document.querySelector('#VistaAcceso').hidden,
        playerHidden: document.querySelector('#PlayerApp').hidden,
        hasCookie: document.cookie.includes('air_player_session=')
    })`);

    if (!logoutState.loginVisible || !logoutState.playerHidden || logoutState.hasCookie) {
        throw new Error(`Cierre de sesión inesperado: ${JSON.stringify(logoutState)}`);
    }

    await send("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        screenWidth: 390,
        screenHeight: 844,
        deviceScaleFactor: 1,
        mobile: true
    });
    const mobileScreenshot = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false
    });
    fs.writeFileSync(MOBILE_SCREENSHOT_PATH, Buffer.from(mobileScreenshot.data, "base64"));

    socket.close();
    console.log(JSON.stringify({
        login: "ok",
        cookie: "ok",
        reload: "ok",
        logout: "ok",
        screenshot: SCREENSHOT_PATH,
        mobileScreenshot: MOBILE_SCREENSHOT_PATH
    }));
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
