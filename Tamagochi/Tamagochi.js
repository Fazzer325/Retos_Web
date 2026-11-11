"use strict";

/* ================================================================
   CONFIGURACIÓN DE DIFICULTAD
   Todos los números del juego están aquí para ajustarlos fácilmente.
   ================================================================ */
const REGLAS = {
    horasDelDia: 24,
    segundosPorHora: 6,

    // Cuánto baja cada indicador por hora
    desgastePorHora: { hambre: 8, diversion: 6, higiene: 5 },

    // Comida: horarios, tiempo para atender y límites
    horasDeComida: [6, 12, 18],
    horasParaComer: 2,
    comidaPedida: 40,      // +hambre si come cuando lo pide
    comidaExtra: 20,       // +hambre si come sin pedirlo
    maxOmisiones: 2,       // comidas olvidadas => fantasma
    maxComidasExtra: 3,    // comidas de más => fantasma

    // Acciones
    jugar: 25,             // +diversión
    suciedadAlJugar: 8,    // −higiene al jugar
    duchar: 30,            // +higiene

    // Eventos aleatorios
    cadaHorasEvento: 2,
    probabilidadEvento: 0.6,
    horasParaEvento: 2,
    castigoEvento: 15,     // −indicador si se ignora el evento

    // Felicidad mínima: si baja hasta aquí, se vuelve fantasma
    felicidadMinima: 15
};

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
            horaSolicitudComida: null,   // hora en que pidió comida (null = no la pide)
            omisionesComida: 0,
            comidasExtra: 0,
            eventoPendiente: null,       // "jugar" | "baño" | null
            horaEvento: null,
            usadoEstaHora: { alimentar: false, jugar: false, duchar: false },
            fantasma: false,
            motivoFantasma: "",
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

    /* ---------- Paso del tiempo ---------- */

    avanzarHora() {
        if (this.estado.terminado) {
            return;
        }

        const { necesidades } = this.estado;
        this.estado.hora += 1;

        // 1. Las necesidades bajan solas
        Object.entries(REGLAS.desgastePorHora).forEach(([tipo, cantidad]) => {
            necesidades[tipo] = limitar(necesidades[tipo] - cantidad);
        });

        // 2. Cada botón vuelve a estar disponible en la nueva hora
        this.estado.usadoEstaHora = { alimentar: false, jugar: false, duchar: false };

        // 3. Eventos aleatorios y horarios de comida
        this.revisarEventos();
        if (this.estado.terminado) return;
        this.revisarHorarioDeComida();
        if (this.estado.terminado) return;

        // 4. Felicidad y tristeza extrema
        this.actualizarFelicidad();
        if (necesidades.felicidad <= REGLAS.felicidadMinima) {
            this.convertirEnFantasma("Se puso demasiado triste.");
            return;
        }

        // 5. Fin del día
        if (this.estado.hora >= REGLAS.horasDelDia) {
            this.estado.terminado = true;
            this.estado.mensaje = `¡${this.estado.nombre} completó sus 24 horas!`;
        } else if (this.estado.horaSolicitudComida === null && !this.estado.eventoPendiente) {
            this.estado.mensaje = this.mensajeSegunEstado();
        }
    }

    revisarHorarioDeComida() {
        const { hora } = this.estado;

        // ¿Se acabó el tiempo para dar la comida pedida?
        if (this.estado.horaSolicitudComida !== null && hora - this.estado.horaSolicitudComida >= REGLAS.horasParaComer) {
            this.estado.horaSolicitudComida = null;
            this.estado.omisionesComida += 1;

            if (this.estado.omisionesComida >= REGLAS.maxOmisiones) {
                this.convertirEnFantasma("No recibió comida en dos horarios.");
                return;
            }

            this.estado.mensaje = `${this.estado.nombre} se quedó sin comer (${this.estado.omisionesComida} de ${REGLAS.maxOmisiones}).`;
        }

        // ¿Toca pedir comida?
        if (REGLAS.horasDeComida.includes(hora)) {
            this.estado.horaSolicitudComida = hora;
            this.estado.mensaje = `¡Es la hora de alimentar a ${this.estado.nombre}!`;
        }
    }

    revisarEventos() {
        const { hora } = this.estado;

        // Evento ignorado: castigo al indicador relacionado
        if (this.estado.eventoPendiente && hora - this.estado.horaEvento >= REGLAS.horasParaEvento) {
            const necesidad = this.estado.eventoPendiente === "jugar" ? "diversion" : "higiene";
            this.estado.necesidades[necesidad] = limitar(this.estado.necesidades[necesidad] - REGLAS.castigoEvento);
            this.estado.acciones.eventosIgnorados += 1;
            this.estado.eventoPendiente = null;
            this.estado.horaEvento = null;
        }

        // Posible evento nuevo
        const tocaEvento = hora % REGLAS.cadaHorasEvento === 0 && hora < REGLAS.horasDelDia;
        if (tocaEvento && !this.estado.eventoPendiente && this.azar() < REGLAS.probabilidadEvento) {
            this.estado.eventoPendiente = this.azar() < 0.5 ? "jugar" : "baño";
            this.estado.horaEvento = hora;
            this.estado.mensaje = this.estado.eventoPendiente === "jugar"
                ? `${this.estado.nombre} quiere jugar contigo.`
                : `${this.estado.nombre} necesita un baño.`;
        }
    }

    /* ---------- Acciones del jugador ---------- */

    puedeUsar(accion) {
        return !this.estado.terminado && !this.estado.usadoEstaHora[accion];
    }

    alimentar() {
        if (!this.puedeUsar("alimentar")) {
            return false;
        }

        this.estado.usadoEstaHora.alimentar = true;
        this.estado.acciones.alimentos += 1;

        if (this.estado.horaSolicitudComida !== null) {
            this.estado.horaSolicitudComida = null;
            this.estado.necesidades.hambre = limitar(this.estado.necesidades.hambre + REGLAS.comidaPedida);
            this.estado.mensaje = `¡Qué rico! ${this.estado.nombre} quedó satisfecho.`;
        } else {
            this.estado.comidasExtra += 1;
            this.estado.necesidades.hambre = limitar(this.estado.necesidades.hambre + REGLAS.comidaExtra);

            if (this.estado.comidasExtra >= REGLAS.maxComidasExtra) {
                this.convertirEnFantasma("Recibió comida de más tres veces.");
                return true;
            }

            this.estado.mensaje = `Cuidado: comida extra ${this.estado.comidasExtra} de ${REGLAS.maxComidasExtra}.`;
        }

        this.actualizarFelicidad();
        return true;
    }

    jugar() {
        if (!this.puedeUsar("jugar")) {
            return false;
        }

        this.estado.usadoEstaHora.jugar = true;
        this.estado.acciones.juegos += 1;
        this.estado.necesidades.diversion = limitar(this.estado.necesidades.diversion + REGLAS.jugar);
        this.estado.necesidades.higiene = limitar(this.estado.necesidades.higiene - REGLAS.suciedadAlJugar);

        if (this.estado.eventoPendiente === "jugar") {
            this.estado.eventoPendiente = null;
            this.estado.horaEvento = null;
            this.estado.acciones.eventosAtendidos += 1;
            this.estado.mensaje = `¡${this.estado.nombre} se divirtió mucho!`;
        } else {
            this.estado.mensaje = `${this.estado.nombre} jugó y se ensució un poco.`;
        }

        this.actualizarFelicidad();
        return true;
    }

    duchar() {
        if (!this.puedeUsar("duchar")) {
            return false;
        }

        this.estado.usadoEstaHora.duchar = true;
        this.estado.acciones.baños += 1;
        this.estado.necesidades.higiene = limitar(this.estado.necesidades.higiene + REGLAS.duchar);

        if (this.estado.eventoPendiente === "baño") {
            this.estado.eventoPendiente = null;
            this.estado.horaEvento = null;
            this.estado.acciones.eventosAtendidos += 1;
            this.estado.mensaje = `¡${this.estado.nombre} quedó reluciente!`;
        } else {
            this.estado.mensaje = `${this.estado.nombre} disfruta estar limpio.`;
        }

        this.actualizarFelicidad();
        return true;
    }

    /* ---------- Utilidades ---------- */

    // Horas que quedan para atender la comida o el evento (null si no hay)
    horasRestantes(tipo) {
        const inicio = tipo === "comida" ? this.estado.horaSolicitudComida : this.estado.horaEvento;
        const limite = tipo === "comida" ? REGLAS.horasParaComer : REGLAS.horasParaEvento;
        return inicio === null ? null : inicio + limite - this.estado.hora;
    }

    actualizarFelicidad() {
        const { hambre, diversion, higiene } = this.estado.necesidades;
        this.estado.necesidades.felicidad = limitar((hambre + diversion + higiene) / 3);
    }

    mensajeSegunEstado() {
        const { hambre, diversion, higiene, felicidad } = this.estado.necesidades;

        if (felicidad <= 30) return `${this.estado.nombre} está muy triste. ¡Cuídalo!`;
        if (hambre <= 25) return `${this.estado.nombre} tiene mucha hambre.`;
        if (higiene <= 25) return `${this.estado.nombre} necesita un baño.`;
        if (diversion <= 25) return `${this.estado.nombre} quiere jugar.`;
        if (hambre <= 50) return `${this.estado.nombre} empieza a tener hambre.`;
        return `${this.estado.nombre} está feliz y tranquilo.`;
    }

    convertirEnFantasma(motivo) {
        this.estado.fantasma = true;
        this.estado.terminado = true;
        this.estado.motivoFantasma = motivo;
        this.estado.horaSolicitudComida = null;
        this.estado.eventoPendiente = null;
        this.estado.horaEvento = null;
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
            motivo: this.estado.motivoFantasma,
            resultado: this.estado.fantasma ? "Se convirtió en fantasma" : "Día completado"
        };
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { JuegoTamagochi, REGLAS };
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

            // Avisos pendientes con las horas que quedan para atenderlos
            const avisos = [];
            const horasComida = juego.horasRestantes("comida");
            const horasEvento = juego.horasRestantes("evento");

            if (horasComida !== null) {
                avisos.push(`🍗 Tiene hambre · ${horasComida} h`);
            }
            if (estado.eventoPendiente) {
                const texto = estado.eventoPendiente === "jugar" ? "🎾 Quiere jugar" : "🧼 Necesita baño";
                avisos.push(`${texto} · ${horasEvento} h`);
            }

            elementos.evento.textContent = avisos.join("   |   ");
            elementos.evento.classList.toggle("oculto", avisos.length === 0);

            elementos.escenario.classList.toggle("es-fantasma", estado.fantasma);
            elementos.fantasma.classList.toggle("oculto", !estado.fantasma);

            // Cada botón se puede usar una sola vez por hora
            [["alimentar", elementos.alimentar], ["jugar", elementos.jugar], ["duchar", elementos.duchar]]
                .forEach(([accion, boton]) => {
                    boton.disabled = !juego.puedeUsar(accion);
                    boton.title = estado.usadoEstaHora[accion] && !estado.terminado
                        ? "Ya lo usaste esta hora. Espera a la siguiente."
                        : "";
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
                ? `La partida terminó a las ${String(resumen.horasCompletadas).padStart(2, "0")}:00. ${resumen.motivo}`
                : `${resumen.nombre} completó sus 24 horas de cuidados.`;
            document.querySelector("#ResumenHoras").textContent = `${resumen.horasCompletadas}/24`;
            document.querySelector("#ResumenAlimentos").textContent = resumen.alimentos;
            document.querySelector("#ResumenJuegos").textContent = resumen.juegos;
            document.querySelector("#ResumenBanos").textContent = resumen.baños;
            document.querySelector("#ResumenEventos").textContent = resumen.eventosAtendidos;
            document.querySelector("#ResumenIgnorados").textContent = resumen.eventosIgnorados;
            document.querySelector("#ResumenOlvidadas").textContent = `${resumen.omisionesComida}/${REGLAS.maxOmisiones}`;
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
            }, REGLAS.segundosPorHora * 1000);
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
