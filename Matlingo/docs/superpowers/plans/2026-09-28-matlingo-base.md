# Matlingo Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una primera versión funcional de Matlingo con cinco temas, sesiones de 20 preguntas, tres vidas, resultados y progreso local.

**Architecture:** La aplicación será una SPA sin compilación, con módulos ES independientes para reglas, preguntas, persistencia e interfaz. El motor y el almacenamiento se probarán con `node:test`; la integración visual se verificará en un navegador real.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, Node.js 24 y `node:test`.

**Spec:** `Matlingo/docs/superpowers/specs/2026-09-28-matlingo-base-design.md`

## Global Constraints

- Mostrar exactamente cinco temas: sumas, restas, multiplicaciones, divisiones y problemas cortos.
- Cada tema debe proporcionar exactamente 20 preguntas de nivel sexto de primaria y cuatro opciones por pregunta.
- Cada sesión comienza con tres vidas y termina al contestar las 20 preguntas o perder las tres vidas.
- Guardar únicamente resultados finalizados bajo la clave `matlingo.progress.v1`.
- Mantener la interfaz responsive, accesible por teclado y respetuosa de `prefers-reduced-motion`.
- No añadir dependencias de producción ni herramientas de compilación.

## Review Focus

- Tema desconocido o banco incompleto: impedir el inicio y devolver un error comprensible.
- Respuesta repetida a una pregunta ya contestada: conservar puntuación y vidas sin cambios.
- Última respuesta incorrecta cuando queda una vida: finalizar inmediatamente la sesión.
- Datos locales corruptos o almacenamiento no disponible: continuar con progreso vacío sin bloquear la aplicación.
- Reinicio después de una sesión terminada: crear estado limpio con tres vidas y cero puntos.

---

### Task 1: Motor del cuestionario

**Files:**
- Create: `Matlingo/package.json`
- Create: `Matlingo/js/quiz.js`
- Create: `Matlingo/tests/quiz.test.js`

**Interfaces:**
- Consumes: preguntas con `{ id, prompt, options, answerIndex }`.
- Produces: `createQuiz(topicId, questions)`, `answerQuestion(state, optionIndex)`, `advanceQuestion(state)` y `getResult(state)`.

- [ ] **Step 1: Escribir pruebas fallidas del estado inicial y validación**

Crear casos que comprueben tres vidas, índice cero, puntuación cero, exactamente 20 preguntas y rechazo de temas vacíos, bancos incompletos y respuestas fuera de rango.

- [ ] **Step 2: Ejecutar las pruebas y comprobar RED**

Run: `node --test tests/quiz.test.js`
Expected: FAIL porque `js/quiz.js` no existe.

- [ ] **Step 3: Implementar el estado inicial y sus validaciones**

Crear `package.json` con `"type": "module"` y script `test`. Implementar `createQuiz(topicId: string, questions: Question[]): QuizState` y validaciones explícitas.

- [ ] **Step 4: Ejecutar pruebas del estado inicial y comprobar GREEN**

Run: `node --test tests/quiz.test.js`
Expected: PASS.

- [ ] **Step 5: Escribir pruebas fallidas de respuestas y finalización**

Cubrir respuesta correcta (+10 puntos), incorrecta (-1 vida), respuesta repetida sin cambios, avance, finalización en la pregunta 20, finalización al perder la última vida, reinicio mediante `createQuiz` y porcentaje entero calculado sobre preguntas contestadas.

- [ ] **Step 6: Ejecutar las pruebas nuevas y comprobar RED**

Run: `node --test tests/quiz.test.js`
Expected: FAIL porque faltan `answerQuestion`, `advanceQuestion` y `getResult`.

- [ ] **Step 7: Implementar las transiciones inmutables**

Implementar `answerQuestion(state: QuizState, optionIndex: number): QuizState`, `advanceQuestion(state: QuizState): QuizState` y `getResult(state: QuizState): QuizResult` sin acceso al DOM ni almacenamiento.

- [ ] **Step 8: Ejecutar la suite y confirmar GREEN**

Run: `node --test`
Expected: todas las pruebas pasan sin advertencias.

- [ ] **Step 9: Commit**

```bash
git add Matlingo/package.json Matlingo/js/quiz.js Matlingo/tests/quiz.test.js
git commit -m "feat: add Matlingo quiz engine"
```

### Task 2: Catálogo y banco de preguntas

**Files:**
- Create: `Matlingo/js/questions.js`
- Create: `Matlingo/tests/questions.test.js`

**Interfaces:**
- Consumes: contrato `Question` usado por `createQuiz` en Task 1.
- Produces: `TOPICS`, `getTopic(topicId)` y `getQuestions(topicId)`.

- [ ] **Step 1: Escribir pruebas fallidas de integridad del catálogo**

Comprobar los cinco identificadores (`addition`, `subtraction`, `multiplication`, `division`, `word-problems`), 20 preguntas por tema, identificadores únicos, cuatro opciones distintas, índice correcto válido y ausencia de división entre cero.

- [ ] **Step 2: Ejecutar las pruebas y comprobar RED**

Run: `node --test tests/questions.test.js`
Expected: FAIL porque `js/questions.js` no existe.

- [ ] **Step 3: Implementar los cinco bancos**

Definir `TOPICS: Topic[]`, `getTopic(topicId: string): Topic | null` y `getQuestions(topicId: string): Question[]`; devolver copias para impedir mutaciones accidentales.

- [ ] **Step 4: Ejecutar la suite y confirmar GREEN**

Run: `node --test`
Expected: todas las pruebas pasan.

- [ ] **Step 5: Commit**

```bash
git add Matlingo/js/questions.js Matlingo/tests/questions.test.js
git commit -m "feat: add sixth grade question banks"
```

### Task 3: Persistencia local del progreso

**Files:**
- Create: `Matlingo/js/storage.js`
- Create: `Matlingo/tests/storage.test.js`

**Interfaces:**
- Consumes: `QuizResult` producido por `getResult` y una API compatible con `localStorage`.
- Produces: `createProgressStore(storage)`, con métodos `getAll()`, `getTopic(topicId)` y `saveResult(topicId, result)`.

- [ ] **Step 1: Escribir pruebas fallidas de lectura segura**

Comprobar progreso vacío sin datos, recuperación desde JSON válido, recuperación desde JSON corrupto y funcionamiento cuando `getItem` lanza una excepción.

- [ ] **Step 2: Ejecutar las pruebas y comprobar RED**

Run: `node --test tests/storage.test.js`
Expected: FAIL porque `js/storage.js` no existe.

- [ ] **Step 3: Implementar lectura tolerante a fallos**

Implementar `createProgressStore(storage = globalThis.localStorage)` y devolver copias de los resultados leídos.

- [ ] **Step 4: Ejecutar las pruebas de lectura y comprobar GREEN**

Run: `node --test tests/storage.test.js`
Expected: PASS.

- [ ] **Step 5: Escribir pruebas fallidas de guardado**

Comprobar la clave `matlingo.progress.v1`, primer resultado, conservación del mejor porcentaje, actualización de `lastResult` y operación segura cuando `setItem` falla.

- [ ] **Step 6: Ejecutar las pruebas nuevas y comprobar RED**

Run: `node --test tests/storage.test.js`
Expected: FAIL porque falta el comportamiento completo de `saveResult`.

- [ ] **Step 7: Implementar guardado y comparación del mejor resultado**

Implementar `saveResult(topicId: string, result: QuizResult): TopicProgress` sin propagar errores del almacenamiento.

- [ ] **Step 8: Ejecutar la suite y confirmar GREEN**

Run: `node --test`
Expected: todas las pruebas pasan.

- [ ] **Step 9: Commit**

```bash
git add Matlingo/js/storage.js Matlingo/tests/storage.test.js
git commit -m "feat: persist Matlingo progress locally"
```

### Task 4: Interfaz responsive e integración del juego

**Files:**
- Modify: `Matlingo/index.html`
- Create: `Matlingo/styles.css`
- Create: `Matlingo/js/app.js`

**Interfaces:**
- Consumes: `TOPICS`, `getQuestions`, `createQuiz`, `answerQuestion`, `advanceQuestion`, `getResult` y `createProgressStore`.
- Produces: flujo navegable selección → cuestionario → resultado y acciones repetir/volver.

- [ ] **Step 1: Reemplazar el HTML vacío por la estructura semántica**

Crear cabecera, región viva de avisos y un `<main id="app">`; cargar `styles.css`, Nunito y `js/app.js` como módulo.

- [ ] **Step 2: Crear el sistema visual responsive**

Implementar los tokens de `AGENT/DESIGN.md`, ruta de temas, tarjeta de pregunta, opciones, corazones, barra de avance, retroalimentación y resultado. Incluir foco visible, área táctil mínima de 44 px y `prefers-reduced-motion`.

- [ ] **Step 3: Integrar las tres vistas**

Implementar renderizado y eventos en `app.js`, bloqueo de respuestas repetidas, mensajes accesibles, salida de sesión, repetición y lectura/guardado del progreso.

- [ ] **Step 4: Ejecutar la suite automatizada**

Run: `node --test`
Expected: todas las pruebas pasan sin advertencias.

- [ ] **Step 5: Verificar el flujo en navegador**

Run: `python -m http.server 4173`
Expected: en `http://localhost:4173`, los cinco temas aparecen; una sesión permite contestar, reduce corazones al fallar, avanza hasta el resultado y permite repetir o volver. Comprobar 390×844 y 1440×900, navegación por teclado y ausencia de errores de consola.

- [ ] **Step 6: Commit**

```bash
git add Matlingo/index.html Matlingo/styles.css Matlingo/js/app.js
git commit -m "feat: build responsive Matlingo learning flow"
```

### Task 5: Documentación y verificación final

**Files:**
- Modify: `../../../AGENT/README.md`

**Interfaces:**
- Consumes: comandos y comportamiento terminados en Tasks 1–4.
- Produces: instrucciones reproducibles de ejecución, pruebas y estructura.

- [ ] **Step 1: Documentar el proyecto**

Reescribir el README con descripción, funciones implementadas, estructura, ejecución local con `python -m http.server 4173`, pruebas con `node --test` y alcance pendiente de Firebase.

- [ ] **Step 2: Ejecutar comprobaciones finales**

Run: `node --test`
Expected: todas las pruebas pasan.

Run: `git diff --check`
Expected: sin errores de espacios ni marcadores de conflicto.

- [ ] **Step 3: Commit**

```bash
git add Matlingo/README.md
git commit -m "docs: explain Matlingo local development"
```
