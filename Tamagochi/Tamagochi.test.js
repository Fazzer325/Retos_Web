const test = require("node:test");
const assert = require("node:assert/strict");

const { JuegoTamagochi } = require("./Tamagochi.js");

test("una hora simulada avanza el reloj y reduce las necesidades", () => {
    const juego = new JuegoTamagochi("Luna", { azar: () => 1 });

    juego.avanzarHora();

    assert.equal(juego.estado.hora, 1);
    assert.deepEqual(juego.estado.necesidades, {
        hambre: 74,
        diversion: 76,
        higiene: 77,
        felicidad: 76
    });
});

test("dos solicitudes de comida ignoradas convierten a la mascota en fantasma", () => {
    const juego = new JuegoTamagochi("Luna", { azar: () => 1 });

    for (let hora = 0; hora < 18; hora += 1) {
        juego.avanzarHora();
    }

    assert.equal(juego.estado.omisionesComida, 2);
    assert.equal(juego.estado.fantasma, true);
    assert.equal(juego.estado.terminado, true);
    assert.match(juego.estado.mensaje, /fantasma/i);
});

test("alimentar durante una solicitud evita que cuente como omisión", () => {
    const juego = new JuegoTamagochi("Luna", { azar: () => 1 });

    for (let hora = 0; hora < 6; hora += 1) {
        juego.avanzarHora();
    }
    juego.alimentar();
    for (let hora = 6; hora < 12; hora += 1) {
        juego.avanzarHora();
    }

    assert.equal(juego.estado.omisionesComida, 0);
    assert.equal(juego.estado.acciones.alimentos, 1);
    assert.equal(juego.estado.solicitudComidaPendiente, true);
});

test("tres comidas fuera de una solicitud convierten a la mascota en fantasma", () => {
    const juego = new JuegoTamagochi("Luna", { azar: () => 1 });

    juego.alimentar();
    juego.alimentar();
    juego.alimentar();

    assert.equal(juego.estado.comidasExtra, 3);
    assert.equal(juego.estado.fantasma, true);
    assert.equal(juego.estado.terminado, true);
});

test("un evento aleatorio de juego se resuelve con el botón jugar", () => {
    const valoresAzar = [0.2, 0.1];
    const juego = new JuegoTamagochi("Luna", {
        azar: () => valoresAzar.shift() ?? 1
    });

    juego.avanzarHora();
    juego.avanzarHora();
    juego.avanzarHora();
    assert.equal(juego.estado.eventoPendiente, "jugar");

    juego.jugar();

    assert.equal(juego.estado.eventoPendiente, null);
    assert.equal(juego.estado.acciones.juegos, 1);
    assert.equal(juego.estado.acciones.eventosAtendidos, 1);
});

test("completar 24 horas genera un resumen del cuidado", () => {
    const juego = new JuegoTamagochi("Luna", { azar: () => 1 });

    while (!juego.estado.terminado) {
        juego.avanzarHora();
        if (juego.estado.solicitudComidaPendiente) {
            juego.alimentar();
        }
    }

    const resumen = juego.obtenerResumen();
    assert.equal(juego.estado.hora, 24);
    assert.equal(juego.estado.fantasma, false);
    assert.equal(resumen.nombre, "Luna");
    assert.equal(resumen.horasCompletadas, 24);
    assert.equal(resumen.alimentos, 3);
    assert.equal(resumen.resultado, "Día completado");
});
