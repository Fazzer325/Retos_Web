# Diseño de la base de Matlingo

## Objetivo

Matlingo será una aplicación web educativa para estudiantes de sexto de primaria. Permitirá practicar sumas, restas, multiplicaciones, divisiones y problemas cortos mediante sesiones de 20 preguntas, cuatro respuestas por pregunta, tres vidas y retroalimentación inmediata.

La primera base debe demostrar el flujo completo de aprendizaje sin depender todavía de un servidor: selección de tema, resolución del cuestionario, control del avance y resultado final. El progreso se guardará en el navegador mediante `localStorage`. La arquitectura aislará la persistencia para poder sustituirla después por Firebase Authentication y Firestore sin reescribir las pantallas ni el motor del cuestionario.

## Alcance inicial

La primera entrega incluirá:

- una portada responsive con los cinco temas requeridos;
- una vista de cuestionario que muestre una pregunta y cuatro opciones;
- contador de pregunta, barra de avance, puntuación y tres corazones;
- validación y mensaje inmediato de respuesta correcta o incorrecta;
- finalización al responder 20 preguntas o perder las tres vidas;
- resumen con aciertos, puntuación y porcentaje;
- reinicio de la sesión y regreso a la selección de temas;
- banco local de 20 preguntas por tema;
- almacenamiento local del mejor resultado y último progreso por tema.

El login real, la sincronización entre dispositivos y el despliegue se abordarán después de validar esta base. La interfaz reservará el punto de entrada para la cuenta, pero no simulará un login que todavía no exista.

## Arquitectura

La aplicación será una SPA ligera sin proceso de compilación. `index.html` contendrá el contenedor principal y las tres vistas semánticas. `styles.css` definirá los tokens visuales y el diseño responsive. Los archivos JavaScript se cargarán como módulos ES.

La estructura prevista es:

```text
Matlingo/
├── index.html
├── styles.css
├── js/
│   ├── app.js
│   ├── quiz.js
│   ├── storage.js
│   └── questions.js
├── README.md
└── AGENT/DESIGN.md
```

Cada módulo tendrá una responsabilidad clara:

- `app.js`: navegación entre vistas, renderizado y eventos de interfaz.
- `quiz.js`: estado y reglas de una sesión, sin acceder al DOM ni al almacenamiento.
- `questions.js`: catálogo de temas y banco de preguntas.
- `storage.js`: lectura y escritura del progreso detrás de una API pequeña.

Esta separación permite cambiar el almacenamiento local por Firebase y probar las reglas del juego sin depender de la interfaz.

## Pantallas y componentes

### Selección de tema

La cabecera mostrará la marca Matlingo, una breve bienvenida y el acceso futuro a la cuenta. El contenido principal tendrá cinco nodos circulares, uno por tema. Cada nodo mostrará nombre, icono, color de ilustración y mejor resultado guardado. Los nodos se organizarán como una ruta vertical en pantallas pequeñas y como un recorrido alternado en pantallas amplias.

### Cuestionario

La parte superior mostrará el botón para salir, una barra de progreso y tres corazones. Debajo aparecerán el tema, “Pregunta N de 20”, el enunciado y cuatro botones de respuesta. Tras elegir una opción, todas las respuestas quedarán bloqueadas y aparecerá una banda de retroalimentación. El botón “Continuar” avanzará a la siguiente pregunta.

Una respuesta correcta incrementará los aciertos y la puntuación. Una respuesta incorrecta consumirá una vida y señalará la opción correcta. La sesión terminará al completar las 20 preguntas o al llegar a cero vidas.

### Resultado

La vista final mostrará un mensaje según el desempeño, total de aciertos, porcentaje y puntuación. Tendrá acciones para repetir el mismo tema y volver al mapa de temas. El mejor resultado se actualizará sólo cuando la puntuación nueva sea mayor.

## Modelo de estado

El motor recibirá una lista de preguntas y mantendrá un estado similar a:

```js
{
  topicId: "addition",
  questionIndex: 0,
  correctAnswers: 0,
  score: 0,
  lives: 3,
  answered: false,
  finished: false
}
```

Las preguntas tendrán un identificador estable, enunciado, cuatro opciones y el índice de la opción correcta. La función que procesa una respuesta devolverá un estado nuevo y el resultado de la operación. Así se evita que la interfaz modifique directamente las reglas del juego.

El almacenamiento local usará una única clave versionada, `matlingo.progress.v1`, con resultados por tema. Una implementación futura de Firebase conservará la misma interfaz de lectura y escritura.

## Dirección visual

La interfaz seguirá `AGENT/DESIGN.md`: fondo blanco, texto gris, verde `#58cc02` para progreso y acciones principales, azul `#1cb0f6` para acciones secundarias, bordes gruesos y esquinas redondeadas. La tipografía será Nunito mediante Google Fonts, con una pila de fuentes del sistema como respaldo.

Los temas podrán usar colores secundarios en sus iconos e ilustraciones, mientras que la navegación y los controles mantendrán el verde y el azul definidos. Las animaciones serán breves y respetarán `prefers-reduced-motion`. Todos los controles tendrán estados visibles de foco, etiquetas accesibles y áreas táctiles de al menos 44 píxeles.

## Manejo de errores

- Si un tema no existe o no contiene 20 preguntas válidas, la aplicación volverá a la selección y mostrará un aviso comprensible.
- Si `localStorage` no está disponible o contiene datos inválidos, la sesión continuará sin persistencia y reconstruirá el estado con valores seguros.
- Una pregunta respondida no aceptará una segunda selección mientras se muestra la retroalimentación.
- Al abandonar una sesión activa se descartará el avance de esa sesión; sólo se guardarán resultados finalizados.

## Verificación

El motor del cuestionario tendrá pruebas para respuesta correcta, respuesta incorrecta, pérdida de vidas, finalización por preguntas, finalización por vidas y cálculo del porcentaje. La capa de almacenamiento se probará con datos válidos y corruptos. También se comprobará manualmente el flujo completo en tamaños móvil y escritorio, la navegación por teclado y los estados de foco.

## Etapas posteriores

Cuando la base local esté estable se añadirá Firebase con acceso por correo o Google y una colección de progreso por usuario. Después se preparará el despliegue público y se documentará la URL en el README. Estas etapas usarán los mismos contratos del motor y la persistencia definidos aquí.
