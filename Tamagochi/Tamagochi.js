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
