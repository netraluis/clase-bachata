# Diseño: shadcn/ui con el preset `b4ccpYALa4`

Toda la interfaz se construye con componentes de [shadcn/ui](https://ui.shadcn.com/docs/components), planos, sin personalizar. El tema lo define el preset: estilo `maia` sobre Base UI, base de color olive, acento verde, Noto Sans para texto y Merriweather para títulos, con tema claro y oscuro según el sistema.

## Reglas

1. **Antes de escribir un elemento de interfaz, búscalo en la biblioteca.** Botón, tarjeta, campo, selector, tabla, aviso, globo, avatar, etiqueta, progreso, estado vacío: todo existe. Se descarga con el CLI y se usa tal cual:
   ```bash
   npx shadcn@latest add <componente>
   ```
   Los instalados están en `src/components/ui/`. Para ver cómo se usa uno: `npx shadcn@latest docs <componente>`.
2. **Nada de CSS propio para lo que shadcn ya resuelve.** No se crean clases `.btn`, `.card` ni parecidas. No se editan los ficheros de `src/components/ui/`.
3. **Colores y tipografía solo del tema.** `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border`, `font-heading`. No se usan hexadecimales ni la paleta de Tailwind (`zinc-500`, `amber-100`…).
4. **Un solo acento.** `primary` (verde) es la acción principal y lo que dice quien enseña. `destructive` para borrar y salir. Todo lo demás, neutro.
5. **Un botón principal por pantalla.** El resto, `variant="outline"` o `ghost`.
6. **Sin enlaces de "volver".** La cabecera lleva el menú (Clases, Cursos, y Subir y Personas según el rol) y marca la sección actual con `variant="secondary"` y `aria-current="page"`; está en `src/components/header-nav.tsx`.
7. **Enlaces con aspecto de botón:** `<Button nativeButton={false} render={<Link href="…" />}>`. Base UI exige `nativeButton={false}` cuando no se renderiza un `<button>`.

## Comprobación

`npm run check:ui` recorre las pantallas y falla si hay un elemento nativo con equivalente en shadcn (`button`, `input`, `select`, `table`, `label`, `ul`/`li`…) o un color fuera del tema. Ejecutarlo antes de cada commit que toque interfaz.

Componentes en uso: Alert, AspectRatio, Avatar, Badge, Button, Card, Empty, Field, Input, Item, Kbd, Label, Progress, Select, Separator, Table, Textarea, Toggle, ToggleGroup, Tooltip. Las listas son `ItemGroup` + `Item`; los grupos de campo, `Field` + `FieldLabel`; los estados vacíos, `Empty`; los atajos de teclado, `Kbd`.

## Lo único que no está en shadcn

La línea de tiempo del vídeo: barra de posición, marcas de notas, tramo en bucle con extremos arrastrables y la fila de tiempo. Vive en `src/app/globals.css` como clases `timeline-*`, usa solo tokens del tema (`--color-primary`, `--color-background`) y se consume desde `src/app/v/[id]/player.tsx`. El globo de cada marca es el `Tooltip` de shadcn. El escenario del vídeo es negro a propósito, como cualquier reproductor, y es la única excepción a la regla de colores.

## Rutas

| Ruta | Qué muestra | Componentes |
|---|---|---|
| `/` | Redirige a `/events` | |
| `/events` | Todas las clases, de más reciente a menos: curso, título de la clase, fecha y sus vídeos | `Card`, `Badge`, `Empty`, `Alert` |
| `/lessons` | Todos los cursos | `Card`, `Empty` |
| `/lessons/[id]` | Un curso con sus clases y vídeos | `Card`, `Button`, `Empty` |
| `/v/[id]` | Reproductor, modo repetir y notas del profe | `Button`, `ToggleGroup`, `Tooltip`, `Card`, `Textarea`, `Badge`, `Alert` |
| `/subir` | Subida: curso detectado por horario, fecha, título de la clase, vídeo | `Card`, `Label`, `Input`, `Select`, `Textarea`, `Progress`, `Alert`, `Button` |
| `/admin` | Escuela, cifras, cursos y personas con rol | `Card`, `Table`, `Input`, `Select`, `Avatar`, `Badge`, `Alert` |
| `/login` | Entrar con Google | `Card`, `Button`, `Alert` |

## Patrones de interacción del reproductor

- **Notas ancladas** (Frame.io, Vimeo Review): al enfocar el campo de texto el vídeo se pausa; el tiempo de la nota es siempre el del cabezal y se muestra en grande junto al campo. Si mueves el vídeo, la nota se mueve. El botón dice "Guardar en 0:23".
- **Marcas en la barra** (SoundCloud): un punto por nota; al pasar el ratón o tocar, un `Tooltip` con tiempo, autor y texto; tocar pausa y salta ahí.
- **Modo repetir** (VLC + Anytune + Moises): es un modo explícito con una guía de tres pasos en la que se resalta el paso actual. Al entrar se ocultan las marcas de notas. El primer toque en la barra pone el inicio, el segundo el fin y empieza a repetir. Después los extremos se arrastran o se afinan con ±1 s. "Salir" va a la derecha de la fila de ajustes; también con Esc. Sin botones de "marcar aquí": la barra es el único sitio donde se marca.
- **Portada**: la miniatura del vídeo hace de `poster`, así se ve el primer fotograma antes de darle a play (como YouTube y Vimeo).

## Jerarquía de datos

Escuela → Curso (nombre, día, hora) → Clase o sesión (fecha, título) → Vídeo → Nota (segundo, autor, rol). Solo profes y admin suben vídeos y escriben notas. La lectura es pública.
