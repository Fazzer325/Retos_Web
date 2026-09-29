"use strict";

const limitar = (valor) => Math.max(0, Math.min(100, Math.round(valor)));

class JuegoTamagochi {
    constructor(nombre, opciones = {}) {
        const nombreLimpio = String(nombre ?? "").trim();

        this.azar = opciones.azar ?? Math.random;
        this.estado = {
            nombre: nombreLimpio.slice(0, 18) || "Tama",
            hora: 0,
            necesidades: {
                hambre: 80,
                diversion: 80,
                higiene: 80,
                felicidad: 80
            },
            solicitudComidaPendiente: false,
            omisionesComida: 0,
            comidasExtra: 0,
            eventoPendiente: null,
            fantasma: false,
            terminado: false,
            mensaje: "¡Hola! Estoy listo para comenzar el día.",
            acciones: {
                alimentos: 0,
                juegos: 0,
                baños: 0,
                eventosAtendidos: 0,
                eventosIgnorados: 0
            }
        };
    }

    avanzarHora() {
        if (this.estado.terminado) {
            return;
        }

        this.estado.hora += 1;
        this.estado.necesidades.hambre = limitar(this.estado.necesidades.hambre - 6);
        this.estado.necesidades.diversion = limitar(this.estado.necesidades.diversion - 4);
        this.estado.necesidades.higiene = limitar(this.estado.necesidades.higiene - 3);
        this.actualizarFelicidad();

        if (this.estado.hora % 3 === 0 && this.estado.hora < 24) {
            this.generarEventoAleatorio();
        }

        if (this.estado.hora % 6 === 0) {
            this.revisarHorarioDeComida();
        }

        if (!this.estado.terminado && this.estado.hora >= 24) {
            this.estado.terminado = true;
            this.estado.mensaje = `¡${this.estado.nombre} completó sus 24 horas!`;
        } else if (!this.estado.terminado && !this.estado.solicitudComidaPendiente && !this.estado.eventoPendiente) {
            this.estado.mensaje = this.mensajeSegunEstado();
        }
    }

    revisarHorarioDeComida() {
        if (this.estado.solicitudComidaPendiente) {
            this.estado.omisionesComida += 1;
            this.estado.solicitudComidaPendiente = false;

            if (this.estado.omisionesComida >= 2) {
                this.convertirEnFantasma("No recibió comida en dos horarios.");
                return;
            }
        }

        if (this.estado.hora < 24) {
            this.estado.solicitudComidaPendiente = true;
            this.estado.mensaje = `¡Es la hora de alimentar a ${this.estado.nombre}!`;
        }
    }

    generarEventoAleatorio() {
        if (this.estado.eventoPendiente) {
            const necesidad = this.estado.eventoPendiente === "jugar" ? "diversion" : "higiene";
            this.estado.necesidades[necesidad] = limitar(this.estado.necesidades[necesidad] - 12);
            this.estado.acciones.eventosIgnorados += 1;
            this.estado.eventoPendiente = null;
            this.actualizarFelicidad();
        }

        if (this.azar() < 0.45) {
            this.estado.eventoPendiente = this.azar() < 0.5 ? "jugar" : "baño";
            this.estado.mensaje = this.estado.eventoPendiente === "jugar"
                ? `${this.estado.nombre} quiere jugar contigo.`
                : `${this.estado.nombre} necesita un baño.`;
        }
    }

    alimentar() {
        if (this.estado.terminado) {
            return;
        }

        this.estado.acciones.alimentos += 1;
        this.estado.necesidades.hambre = limitar(this.estado.necesidades.hambre + 30);

        if (this.estado.solicitudComidaPendiente) {
            this.estado.solicitudComidaPendiente = false;
            this.estado.mensaje = `¡Qué rico! ${this.estado.nombre} quedó satisfecho.`;
        } else {
            this.estado.comidasExtra += 1;

            if (this.estado.comidasExtra >= 3) {
                this.convertirEnFantasma("Recibió comida de más tres veces.");
                return;
            }

            this.estado.mensaje = `Cuidado: comida extra ${this.estado.comidasExtra} de 3.`;
        }

        this.actualizarFelicidad();
    }

    jugar() {
        if (this.estado.terminado) {
            return;
        }

        this.estado.acciones.juegos += 1;
        this.estado.necesidades.diversion = limitar(this.estado.necesidades.diversion + 25);

        if (this.estado.eventoPendiente === "jugar") {
            this.estado.eventoPendiente = null;
            this.estado.acciones.eventosAtendidos += 1;
            this.estado.mensaje = `¡${this.estado.nombre} se divirtió mucho!`;
        } else {
            this.estado.mensaje = `${this.estado.nombre} pasó un buen rato jugando.`;
        }

        this.actualizarFelicidad();
    }

    duchar() {
        if (this.estado.terminado) {
            return;
        }

        this.estado.acciones.baños += 1;
        this.estado.necesidades.higiene = limitar(this.estado.necesidades.higiene + 30);

        if (this.estado.eventoPendiente === "baño") {
            this.estado.eventoPendiente = null;
            this.estado.acciones.eventosAtendidos += 1;
            this.estado.mensaje = `¡${this.estado.nombre} quedó reluciente!`;
        } else {
            this.estado.mensaje = `${this.estado.nombre} disfruta estar limpio.`;
        }

        this.actualizarFelicidad();
    }

    actualizarFelicidad() {
        const { hambre, diversion, higiene } = this.estado.necesidades;
        this.estado.necesidades.felicidad = limitar((hambre + diversion + higiene) / 3);
    }

    mensajeSegunEstado() {
        const { hambre, diversion, higiene } = this.estado.necesidades;

        if (hambre <= 25) return `${this.estado.nombre} tiene mucha hambre.`;
        if (higiene <= 25) return `${this.estado.nombre} necesita un baño.`;
        if (diversion <= 25) return `${this.estado.nombre} quiere jugar.`;
        if (hambre <= 50) return `${this.estado.nombre} empieza a tener hambre.`;
        return `${this.estado.nombre} está feliz y tranquilo.`;
    }

    convertirEnFantasma(motivo) {
        this.estado.fantasma = true;
        this.estado.terminado = true;
        this.estado.solicitudComidaPendiente = false;
        this.estado.eventoPendiente = null;
        this.estado.mensaje = `${this.estado.nombre} se convirtió en fantasma. ${motivo}`;
    }

    obtenerResumen() {
        return {
            nombre: this.estado.nombre,
            horasCompletadas: this.estado.hora,
            alimentos: this.estado.acciones.alimentos,
            juegos: this.estado.acciones.juegos,
            baños: this.estado.acciones.baños,
            eventosAtendidos: this.estado.acciones.eventosAtendidos,
            eventosIgnorados: this.estado.acciones.eventosIgnorados,
            omisionesComida: this.estado.omisionesComida,
            comidasExtra: this.estado.comidasExtra,
            felicidadFinal: this.estado.necesidades.felicidad,
            resultado: this.estado.fantasma ? "Se convirtió en fantasma" : "Día completado"
        };
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { JuegoTamagochi };
}

if (typeof window !== "undefined") {
    window.JuegoTamagochi = JuegoTamagochi;
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        const elementos = {
            nombre: document.querySelector("#NombreMascota"),
            hora: document.querySelector("#Hora"),
            mensaje: document.querySelector("#Mensaje"),
            evento: document.querySelector("#Evento"),
            escenario: document.querySelector("#Escenario"),
            fantasma: document.querySelector("#Fantasma"),
            alimentar: document.querySelector("#Alimentar"),
            jugar: document.querySelector("#Jugar"),
            duchar: document.querySelector("#Duchar"),
            formulario: document.querySelector("#FormularioInicio"),
            nombreInput: document.querySelector("#NombreInput"),
            modalInicio: document.querySelector("#ModalInicio"),
            modalResumen: document.querySelector("#ModalResumen"),
            reiniciar: document.querySelector("#Reiniciar")
        };

        const indicadores = {
            hambre: {
                texto: document.querySelector("#TextoHambre"),
                nivel: document.querySelector("#NivelHambre")
            },
            diversion: {
                texto: document.querySelector("#TextoDiversion"),
                nivel: document.querySelector("#NivelDiversion")
            },
            higiene: {
                texto: document.querySelector("#TextoHigiene"),
                nivel: document.querySelector("#NivelHigiene")
            },
            felicidad: {
                texto: document.querySelector("#TextoFelicidad"),
                nivel: document.querySelector("#NivelFelicidad")
            }
        };

        let juego = null;
        let temporizador = null;
        let resumenProgramado = false;

        const descripciones = {
            hambre: ["Muy hambriento", "Con hambre", "Satisfecho"],
            diversion: ["Aburrido", "Quiere jugar", "Entretenido"],
            higiene: ["Necesita baño", "Algo sucio", "Muy limpio"],
            felicidad: ["Triste", "Animado", "Muy feliz"]
        };

        function descripcionDe(tipo, valor) {
            if (valor <= 25) return descripciones[tipo][0];
            if (valor <= 60) return descripciones[tipo][1];
            return descripciones[tipo][2];
        }

        function actualizarIndicador(tipo, valor) {
            const indicador = indicadores[tipo];
            indicador.texto.textContent = descripcionDe(tipo, valor);
            indicador.nivel.style.setProperty("--nivel", `${valor}%`);
            indicador.nivel.dataset.estado = valor <= 25 ? "peligro" : valor <= 60 ? "medio" : "bien";
            indicador.nivel.parentElement.setAttribute("aria-label", `${tipo} al ${valor}%`);
        }

        function actualizarInterfaz() {
            if (!juego) return;

            const { estado } = juego;
            elementos.nombre.textContent = estado.nombre;
            elementos.hora.textContent = `${String(estado.hora).padStart(2, "0")}:00`;
            elementos.mensaje.textContent = estado.mensaje;

            Object.entries(estado.necesidades).forEach(([tipo, valor]) => {
                actualizarIndicador(tipo, valor);
            });

            if (estado.eventoPendiente) {
                elementos.evento.textContent = estado.eventoPendiente === "jugar"
                    ? "Evento: quiere jugar 🎾"
                    : "Evento: necesita un baño 🧼";
                elementos.evento.classList.remove("oculto");
            } else {
                elementos.evento.classList.add("oculto");
            }

            elementos.escenario.classList.toggle("es-fantasma", estado.fantasma);
            elementos.fantasma.classList.toggle("oculto", !estado.fantasma);

            [elementos.alimentar, elementos.jugar, elementos.duchar].forEach((boton) => {
                boton.disabled = estado.terminado;
            });

            if (estado.terminado && !resumenProgramado) {
                resumenProgramado = true;
                clearInterval(temporizador);
                setTimeout(mostrarResumen, estado.fantasma ? 1000 : 450);
            }
        }

        function mostrarResumen() {
            if (!juego) return;

            const resumen = juego.obtenerResumen();
            document.querySelector("#EmojiResultado").textContent = juego.estado.fantasma ? "👻" : "🏆";
            document.querySelector("#TituloResumen").textContent = juego.estado.fantasma
                ? `${resumen.nombre} es un fantasma`
                : "¡Día completado!";
            document.querySelector("#TextoResultado").textContent = juego.estado.fantasma
                ? "La partida terminó por falta o exceso de comida."
                : `${resumen.nombre} completó sus 24 horas de cuidados.`;
            document.querySelector("#ResumenHoras").textContent = `${resumen.horasCompletadas}/24`;
            document.querySelector("#ResumenAlimentos").textContent = resumen.alimentos;
            document.querySelector("#ResumenJuegos").textContent = resumen.juegos;
            document.querySelector("#ResumenBanos").textContent = resumen.baños;
            document.querySelector("#ResumenEventos").textContent = resumen.eventosAtendidos;
            document.querySelector("#ResumenFelicidad").textContent = `${resumen.felicidadFinal}%`;
            elementos.modalResumen.classList.remove("oculto");
        }

        function iniciarJuego(evento) {
            evento.preventDefault();
            juego = new JuegoTamagochi(elementos.nombreInput.value);
            window.juegoActual = juego;
            resumenProgramado = false;
            elementos.modalInicio.classList.add("oculto");
            elementos.modalResumen.classList.add("oculto");
            actualizarInterfaz();
            temporizador = setInterval(() => {
                juego.avanzarHora();
                actualizarInterfaz();
            }, 6000);
        }

        function reiniciarJuego() {
            clearInterval(temporizador);
            juego = null;
            window.juegoActual = null;
            resumenProgramado = false;
            elementos.modalResumen.classList.add("oculto");
            elementos.modalInicio.classList.remove("oculto");
            elementos.nombreInput.value = "";
            elementos.nombreInput.focus();
            [elementos.alimentar, elementos.jugar, elementos.duchar].forEach((boton) => {
                boton.disabled = true;
            });
        }

        elementos.formulario.addEventListener("submit", iniciarJuego);
        elementos.alimentar.addEventListener("click", () => {
            juego?.alimentar();
            actualizarInterfaz();
        });
        elementos.jugar.addEventListener("click", () => {
            juego?.jugar();
            actualizarInterfaz();
        });
        elementos.duchar.addEventListener("click", () => {
            juego?.duchar();
            actualizarInterfaz();
        });
        elementos.reiniciar.addEventListener("click", reiniciarJuego);
    });
}
