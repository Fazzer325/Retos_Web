"use strict";

function formatearTiempo(segundos) {
    if (!Number.isFinite(segundos) || segundos < 0) {
        return "00:00";
    }

    const minutos = Math.floor(segundos / 60);
    const resto = Math.floor(segundos % 60);
    return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

class EstadoReproductor {
    constructor(totalCanciones, azar = Math.random) {
        if (!Number.isInteger(totalCanciones) || totalCanciones < 1) {
            throw new RangeError("El reproductor necesita al menos una canción.");
        }

        this.totalCanciones = totalCanciones;
        this.azar = azar;
        this.indiceActual = 0;
        this.reproduciendo = false;
        this.aleatorio = false;
        this.favoritas = new Set();
    }

    seleccionar(indice) {
        if (!Number.isInteger(indice) || indice < 0 || indice >= this.totalCanciones) {
            throw new RangeError("La canción seleccionada no existe.");
        }

        this.indiceActual = indice;
        return this.indiceActual;
    }

    siguiente() {
        if (this.aleatorio && this.totalCanciones > 1) {
            let nuevoIndice = Math.floor(this.azar() * (this.totalCanciones - 1));
            if (nuevoIndice >= this.indiceActual) {
                nuevoIndice += 1;
            }
            return this.seleccionar(nuevoIndice);
        }

        return this.seleccionar((this.indiceActual + 1) % this.totalCanciones);
    }

    anterior() {
        return this.seleccionar((this.indiceActual - 1 + this.totalCanciones) % this.totalCanciones);
    }

    alternarAleatorio() {
        this.aleatorio = !this.aleatorio;
        return this.aleatorio;
    }

    alternarFavorito(indice = this.indiceActual) {
        if (!Number.isInteger(indice) || indice < 0 || indice >= this.totalCanciones) {
            throw new RangeError("La canción seleccionada no existe.");
        }

        if (this.favoritas.has(indice)) {
            this.favoritas.delete(indice);
            return false;
        }

        this.favoritas.add(indice);
        return true;
    }

    esFavorita(indice = this.indiceActual) {
        return this.favoritas.has(indice);
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { EstadoReproductor, formatearTiempo };
}

if (typeof window !== "undefined") {
    window.EstadoReproductor = EstadoReproductor;
    window.formatearTiempo = formatearTiempo;
}

const CATALOGO = [
    {
        titulo: "Midnight Glass",
        artista: "Lumen Vale",
        album: "Cloud Studies",
        anio: 2026,
        genero: "Ambient",
        tema: "azul",
        archivo: "Musica/01-midnight-glass.wav"
    },
    {
        titulo: "Cloudline",
        artista: "Orin Grey",
        album: "Open Skies",
        anio: 2026,
        genero: "Downtempo",
        tema: "humo",
        archivo: "Musica/02-cloudline.wav"
    },
    {
        titulo: "Afterglow",
        artista: "Nora Field",
        album: "Soft Geometry",
        anio: 2025,
        genero: "Dream pop",
        tema: "claro",
        archivo: "Musica/03-afterglow.wav"
    },
    {
        titulo: "Still Moving",
        artista: "North/West",
        album: "Quiet Motion",
        anio: 2026,
        genero: "Electronic",
        tema: "tinta",
        archivo: "Musica/04-still-moving.wav"
    },
    {
        titulo: "White Noise",
        artista: "Aster Club",
        album: "Frequency",
        anio: 2025,
        genero: "Minimal",
        tema: "blanco",
        archivo: "Musica/05-white-noise.wav"
    },
    {
        titulo: "Last Light",
        artista: "Velvet Hours",
        album: "Blue Evening",
        anio: 2026,
        genero: "Ambient",
        tema: "noche",
        archivo: "Musica/06-last-light.wav"
    }
];

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        const audio = document.querySelector("#Audio");
        const canciones = [...document.querySelectorAll("[data-track]")];
        const estado = new EstadoReproductor(CATALOGO.length);
        const claveFavoritos = "air-player-favoritos";
        const claveVolumen = "air-player-volumen";

        const interfaz = {
            estado: document.querySelector("#EstadoReproductor"),
            aleatorio: document.querySelector('[data-action="shuffle"]'),
            favorito: document.querySelector('[data-action="favorite"]'),
            anterior: document.querySelector('[data-action="previous"]'),
            reproducir: document.querySelector('[data-action="play"]'),
            siguiente: document.querySelector('[data-action="next"]'),
            progreso: document.querySelector("#BarraProgreso"),
            volumen: document.querySelector("#ControlVolumen"),
            tiempoActual: document.querySelector("#TiempoActual"),
            tiempoTotal: document.querySelector("#TiempoTotal"),
            portada: document.querySelector("#PortadaActual"),
            portadaMeta: document.querySelector("#PortadaMeta"),
            portadaCompacta: document.querySelector("#PortadaCompacta"),
            album: document.querySelector("#AlbumActual"),
            titulo: document.querySelector("#TituloActual"),
            artista: document.querySelector("#ArtistaActual"),
            anio: document.querySelector("#AnoActual"),
            genero: document.querySelector("#GeneroActual"),
            duracion: document.querySelector("#DuracionActual"),
            tituloCompacto: document.querySelector("#TituloCompacto"),
            artistaCompacto: document.querySelector("#ArtistaCompacto")
        };

        function leerPreferencias() {
            try {
                const favoritos = JSON.parse(localStorage.getItem(claveFavoritos) ?? "[]");
                favoritos
                    .filter((indice) => Number.isInteger(indice) && indice >= 0 && indice < CATALOGO.length)
                    .forEach((indice) => estado.favoritas.add(indice));

                const volumenGuardado = Number(localStorage.getItem(claveVolumen));
                if (Number.isFinite(volumenGuardado) && volumenGuardado >= 0 && volumenGuardado <= 1) {
                    audio.volume = volumenGuardado;
                    interfaz.volumen.value = String(Math.round(volumenGuardado * 100));
                } else {
                    audio.volume = Number(interfaz.volumen.value) / 100;
                }
            } catch {
                audio.volume = Number(interfaz.volumen.value) / 100;
            }
        }

        function guardarFavoritos() {
            try {
                localStorage.setItem(claveFavoritos, JSON.stringify([...estado.favoritas]));
            } catch {
                interfaz.estado.textContent = "Favoritos disponibles durante esta sesión";
            }
        }

        function actualizarBotonReproduccion() {
            const reproduciendo = !audio.paused && !audio.ended;
            estado.reproduciendo = reproduciendo;
            interfaz.reproducir.dataset.playing = String(reproduciendo);
            interfaz.reproducir.setAttribute("aria-label", reproduciendo ? "Pausar" : "Reproducir");

            canciones.forEach((boton, indice) => {
                boton.classList.toggle("esta-sonando", reproduciendo && indice === estado.indiceActual);
            });
        }

        function actualizarFavorito() {
            const activa = estado.esFavorita();
            interfaz.favorito.setAttribute("aria-pressed", String(activa));
            interfaz.favorito.setAttribute(
                "aria-label",
                activa ? "Eliminar de favoritos" : "Guardar en favoritos"
            );
        }

        function actualizarInformacion() {
            const pista = CATALOGO[estado.indiceActual];

            canciones.forEach((boton, indice) => {
                const activa = indice === estado.indiceActual;
                boton.classList.toggle("Cancion_activa", activa);
                if (activa) {
                    boton.setAttribute("aria-current", "true");
                } else {
                    boton.removeAttribute("aria-current");
                }
            });

            interfaz.portada.dataset.theme = pista.tema;
            interfaz.portada.setAttribute("aria-label", `Portada abstracta de ${pista.titulo}`);
            interfaz.portadaMeta.textContent = `${pista.album} · ${pista.anio}`;
            interfaz.album.textContent = pista.album;
            interfaz.titulo.textContent = pista.titulo;
            interfaz.artista.textContent = pista.artista;
            interfaz.anio.textContent = pista.anio;
            interfaz.genero.textContent = pista.genero;
            interfaz.tituloCompacto.textContent = pista.titulo;
            interfaz.artistaCompacto.textContent = pista.artista;
            interfaz.portadaCompacta.className = `Mini_portada Mini_portada--${pista.tema}`;
            actualizarFavorito();
            actualizarBotonReproduccion();
        }

        function actualizarProgreso() {
            const duracion = Number.isFinite(audio.duration) ? audio.duration : 0;
            const actual = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
            interfaz.progreso.max = String(duracion || 0);
            interfaz.progreso.value = String(actual);
            interfaz.tiempoActual.textContent = formatearTiempo(actual);
            interfaz.tiempoActual.dateTime = `PT${Math.floor(actual)}S`;
            interfaz.tiempoTotal.textContent = formatearTiempo(duracion);
            interfaz.tiempoTotal.dateTime = `PT${Math.floor(duracion)}S`;
            interfaz.duracion.textContent = formatearTiempo(duracion);
            interfaz.progreso.setAttribute(
                "aria-valuetext",
                `${formatearTiempo(actual)} de ${formatearTiempo(duracion)}`
            );

            if (duracion > 0) {
                canciones[estado.indiceActual].querySelector(".Duracion").textContent = formatearTiempo(duracion);
            }
        }

        async function iniciarReproduccion() {
            try {
                await audio.play();
                interfaz.estado.textContent = `Reproduciendo · ${CATALOGO[estado.indiceActual].titulo}`;
            } catch {
                interfaz.estado.textContent = "Pulsa reproducir para iniciar el audio";
                actualizarBotonReproduccion();
            }
        }

        function cargarCancion(indice, reproducir = false) {
            estado.seleccionar(indice);
            const pista = CATALOGO[indice];
            audio.src = pista.archivo;
            audio.load();
            interfaz.progreso.value = "0";
            interfaz.tiempoActual.textContent = "00:00";
            interfaz.estado.textContent = `Cargada · ${pista.titulo}`;
            actualizarInformacion();

            if (reproducir) {
                iniciarReproduccion();
            }
        }

        function avanzar(reproducir = true) {
            cargarCancion(estado.siguiente(), reproducir);
        }

        function retroceder() {
            if (audio.currentTime > 3) {
                audio.currentTime = 0;
                actualizarProgreso();
                return;
            }

            cargarCancion(estado.anterior(), true);
        }

        canciones.forEach((boton, indice) => {
            boton.addEventListener("click", () => cargarCancion(indice, true));
        });

        interfaz.reproducir.addEventListener("click", () => {
            if (audio.paused) {
                iniciarReproduccion();
            } else {
                audio.pause();
            }
        });
        interfaz.siguiente.addEventListener("click", () => avanzar(true));
        interfaz.anterior.addEventListener("click", retroceder);
        interfaz.aleatorio.addEventListener("click", () => {
            const activo = estado.alternarAleatorio();
            interfaz.aleatorio.setAttribute("aria-pressed", String(activo));
            interfaz.estado.textContent = activo ? "Modo aleatorio activado" : "Modo aleatorio desactivado";
        });
        interfaz.favorito.addEventListener("click", () => {
            const activa = estado.alternarFavorito();
            guardarFavoritos();
            actualizarFavorito();
            interfaz.estado.textContent = activa ? "Añadida a favoritos" : "Eliminada de favoritos";
        });
        interfaz.progreso.addEventListener("input", () => {
            if (Number.isFinite(audio.duration)) {
                audio.currentTime = Number(interfaz.progreso.value);
                actualizarProgreso();
            }
        });
        interfaz.volumen.addEventListener("input", () => {
            audio.volume = Number(interfaz.volumen.value) / 100;
            try {
                localStorage.setItem(claveVolumen, String(audio.volume));
            } catch {
                // El volumen sigue funcionando aunque el navegador bloquee el almacenamiento.
            }
        });

        audio.addEventListener("loadedmetadata", actualizarProgreso);
        audio.addEventListener("timeupdate", actualizarProgreso);
        audio.addEventListener("play", actualizarBotonReproduccion);
        audio.addEventListener("pause", actualizarBotonReproduccion);
        audio.addEventListener("ended", () => avanzar(true));
        audio.addEventListener("error", () => {
            interfaz.estado.textContent = "No se pudo cargar la pista de audio";
            actualizarBotonReproduccion();
        });

        document.addEventListener("keydown", (evento) => {
            const elementoActivo = document.activeElement?.tagName;
            if (evento.code === "Space" && !["INPUT", "BUTTON", "A"].includes(elementoActivo)) {
                evento.preventDefault();
                interfaz.reproducir.click();
            }
        });

        leerPreferencias();
        interfaz.aleatorio.setAttribute("aria-pressed", "false");
        cargarCancion(0, false);

        window.reproductorAir = {
            audio,
            estado,
            catalogo: CATALOGO,
            cargarCancion,
            avanzar,
            retroceder
        };
    });
}
