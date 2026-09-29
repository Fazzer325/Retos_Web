(function (globalScope) {
    "use strict";

    const COOKIE_NAME = "air_player_session";
    const REMEMBER_SECONDS = 7 * 24 * 60 * 60;

    function normalizeName(value) {
        const name = String(value ?? "").trim().replace(/\s+/g, " ");
        if (name.length < 2 || name.length > 40) {
            throw new Error("Escribe un nombre de entre 2 y 40 caracteres.");
        }
        return name;
    }

    function normalizeEmail(value) {
        const email = String(value ?? "").trim().toLowerCase();
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (email.length > 120 || !pattern.test(email)) {
            throw new Error("Escribe un correo electrónico válido.");
        }
        return email;
    }

    function generateSessionId() {
        if (globalScope.crypto?.randomUUID) {
            return globalScope.crypto.randomUUID();
        }

        if (globalScope.crypto?.getRandomValues) {
            const bytes = new Uint8Array(16);
            globalScope.crypto.getRandomValues(bytes);
            return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
        }

        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function createSession(
        { name, email, remember = false } = {},
        { now = Date.now(), generateId = generateSessionId } = {}
    ) {
        const shouldRemember = Boolean(remember);

        return {
            version: 1,
            id: generateId(),
            name: normalizeName(name),
            email: normalizeEmail(email),
            remember: shouldRemember,
            createdAt: now,
            expiresAt: shouldRemember ? now + REMEMBER_SECONDS * 1000 : null
        };
    }

    function encodeBase64Url(value) {
        if (typeof Buffer !== "undefined") {
            return Buffer.from(value, "utf8").toString("base64url");
        }

        const bytes = new TextEncoder().encode(value);
        let binary = "";
        bytes.forEach((byte) => {
            binary += String.fromCharCode(byte);
        });

        return btoa(binary)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
    }

    function decodeBase64Url(value) {
        if (typeof Buffer !== "undefined") {
            return Buffer.from(value, "base64url").toString("utf8");
        }

        const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    function serializeSession(session) {
        return encodeBase64Url(JSON.stringify(session));
    }

    function buildUserStorageKey(baseKey, session) {
        const account = session?.email
            ? encodeBase64Url(normalizeEmail(session.email))
            : "invitado";
        return `${baseKey}:${account}`;
    }

    function parseSession(value) {
        try {
            const session = JSON.parse(decodeBase64Url(value));
            const validExpiration = session.expiresAt === null || Number.isFinite(session.expiresAt);

            if (
                session.version !== 1 ||
                typeof session.id !== "string" ||
                session.id.length < 1 ||
                typeof session.name !== "string" ||
                typeof session.email !== "string" ||
                typeof session.remember !== "boolean" ||
                !Number.isFinite(session.createdAt) ||
                !validExpiration
            ) {
                return null;
            }

            return session;
        } catch {
            return null;
        }
    }

    function getCookieValue(cookieString, cookieName) {
        const prefix = `${cookieName}=`;
        const match = String(cookieString ?? "")
            .split(";")
            .map((cookie) => cookie.trim())
            .find((cookie) => cookie.startsWith(prefix));

        return match ? match.slice(prefix.length) : null;
    }

    function readSessionFromCookies(cookieString, now = Date.now()) {
        const value = getCookieValue(cookieString, COOKIE_NAME);
        if (!value) return null;

        const session = parseSession(value);
        if (!session) return null;
        if (session.expiresAt !== null && session.expiresAt <= now) return null;
        return session;
    }

    function buildSessionCookie(session, { isHttps = false } = {}) {
        const attributes = [
            `${COOKIE_NAME}=${serializeSession(session)}`,
            "Path=/",
            "SameSite=Strict"
        ];

        if (session.remember) attributes.push(`Max-Age=${REMEMBER_SECONDS}`);
        if (isHttps) attributes.push("Secure");
        return attributes.join("; ");
    }

    function buildLogoutCookie({ isHttps = false } = {}) {
        const attributes = [
            `${COOKIE_NAME}=`,
            "Path=/",
            "SameSite=Strict",
            "Max-Age=0"
        ];

        if (isHttps) attributes.push("Secure");
        return attributes.join("; ");
    }

    const api = {
        COOKIE_NAME,
        REMEMBER_SECONDS,
        createSession,
        serializeSession,
        readSessionFromCookies,
        buildSessionCookie,
        buildLogoutCookie,
        buildUserStorageKey,
        getActiveSession: () => activeSession
    };

    let activeSession = null;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }

    if (typeof window !== "undefined") {
        globalScope.AirPlayerAuth = api;
    }

    if (typeof document === "undefined") return;

    const loginView = document.querySelector("#VistaAcceso");
    const playerView = document.querySelector("#PlayerApp");
    const loginForm = document.querySelector("#FormularioAcceso");
    const logoutButton = document.querySelector("#CerrarSesion");
    const formMessage = document.querySelector("#MensajeAcceso");
    const cookieNotice = document.querySelector("#AvisoCookie");

    function isHttps() {
        return globalScope.location.protocol === "https:";
    }

    function showSession(session, notice = "") {
        const hasSession = Boolean(session);
        activeSession = session ?? null;
        loginView.hidden = hasSession;
        playerView.hidden = !hasSession;
        document.body.classList.toggle("Sesion_activa", hasSession);

        document.dispatchEvent(new CustomEvent("airplayer:sessionchange", {
            detail: { session: activeSession }
        }));

        if (!session) return;

        document.querySelector("#InicialUsuario").textContent = session.name.charAt(0).toUpperCase();
        document.querySelector("#NombreUsuario").textContent = session.name;
        document.querySelector("#CorreoUsuario").textContent = session.email;
        cookieNotice.textContent = notice;
        cookieNotice.hidden = !notice;
    }

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        formMessage.textContent = "";

        const formData = new FormData(loginForm);
        try {
            const session = createSession({
                name: formData.get("name"),
                email: formData.get("email"),
                remember: formData.get("remember") === "on"
            });

            document.cookie = buildSessionCookie(session, { isHttps: isHttps() });
            const restoredSession = readSessionFromCookies(document.cookie);
            showSession(
                restoredSession ?? session,
                restoredSession
                    ? ""
                    : "La cookie fue bloqueada. Abre el reproductor desde un servidor local para conservar la sesión."
            );
            loginForm.reset();
        } catch (error) {
            formMessage.textContent = error.message;
        }
    });

    logoutButton.addEventListener("click", () => {
        document.cookie = buildLogoutCookie({ isHttps: isHttps() });
        globalScope.reproductorAir?.audio.pause();
        showSession(null);
        formMessage.textContent = "Sesión cerrada correctamente.";
        document.querySelector("#NombreAcceso").focus();
    });

    const savedSession = readSessionFromCookies(document.cookie);
    if (savedSession) {
        showSession(savedSession);
    } else {
        document.cookie = buildLogoutCookie({ isHttps: isHttps() });
        showSession(null);
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
