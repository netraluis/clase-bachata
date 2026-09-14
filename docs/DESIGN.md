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
6. **Sin enlaces de "volver".** La cabecera lleva el menú (Clases, Cursos, y Subir y Personas según el rol) y marca la sección actual con `variant="secondary"` y `aria-current="page"`. En escritorio va en línea; por debajo de `md` se recoge en un `Sheet` lateral con los enlaces y la sesión. Está en `src/components/header-nav.tsx`.
7. **Móvil primero.** Toda fila de controles usa `flex-wrap`, y lo que no cabe en 360 px se apila con `flex-col sm:flex-row`. Nada tiene ancho fijo mayor que la pantalla. Las tablas no se usan para listas de gestión: `Table` desborda en móvil; se usa `ItemGroup` + `Item`, con `ItemActions` a línea completa en móvil (`basis-full sm:basis-auto`). Antes de dar por buena una pantalla, se revisa a 360 px con sesión de admin, que es la que más controles muestra.
8. **Enlaces con aspecto de botón:** `<Button nativeButton={false} render={<Link href="…" />}>`. Base UI exige `nativeButton={false}` cuando no se renderiza un `<button>`.

## Logo

Símbolo de Compás: un círculo en `primary` con una persona bailando de perfil en estilo pictograma (brazo arriba, pierna extendida) y, debajo, una línea de tiempo con una marca de nota, que es lo que distingue a la app. Está pensado para leerse a 16 px.

- `src/components/logo.tsx`: SVG en línea que hereda `currentColor`; en la cabecera va con `text-primary`, así sigue al tema.
- `src/app/icon.svg`: favicon (Next lo enlaza solo). `src/app/apple-icon.png`: icono de iOS, 180 px.
- `public/logo.svg`, `public/icon-192.png`, `public/icon-512.png`: para el manifest (`src/app/manifest.ts`) y para usar fuera de la app.
- Verde fijo en los ficheros estáticos: `#2f8a4f`, el `primary` del preset en tema claro.

## Comprobación

`npm run check:ui` recorre las pantallas y falla si hay un elemento nativo con equivalente en shadcn (`button`, `input`, `select`, `table`, `label`, `ul`/`li`…) o un color fuera del tema. Ejecutarlo antes de cada commit que toque interfaz.

Componentes en uso: Alert, AspectRatio, Avatar, Badge, Button, ButtonGroup, Card, Sheet, Skeleton, Spinner, Empty, Field, Input, Item, Kbd, Label, Progress, Select, Separator, Table, Textarea, Toggle, ToggleGroup, Tooltip. Las listas son `ItemGroup` + `Item`; los pares de botones que no deben separarse (±1 s), `ButtonGroup`; los grupos de campo, `Field` + `FieldLabel`; los estados vacíos, `Empty`; los atajos de teclado, `Kbd`.

## Estados de carga

Cada ruta tiene un `loading.tsx` con `Skeleton` que reproduce la forma de la pantalla (lista de tarjetas, reproductor, formulario). Next lo muestra al instante al navegar mientras el servidor responde. Los botones que esperan al servidor (subir, guardar nota, cambiar rol) muestran `Spinner`. El esqueleto de listas está en `src/components/loading-list.tsx`.

## Rendimiento

Las funciones corren en Frankfurt (`vercel.json`, `regions: ["fra1"]`), en la misma región que Supabase. Las páginas hacen las consultas en paralelo o embebidas con joins de PostgREST, nunca encadenadas: cada ida y vuelta a la base de datos son decenas de milisegundos, y encadenar cuatro se nota.

## Lo único que no está en shadcn

La línea de tiempo del vídeo: barra de posición, marcas de notas, tramo en bucle y la fila de tiempo, y la tira de fotogramas del modo repetir con sus dos asas (`timeline-trim-handle`). Vive en `src/app/globals.css` como clases `timeline-*`, usa solo tokens del tema (`--color-primary`, `--color-background`) y se consume desde `src/app/v/[id]/player.tsx`. El globo de cada marca es el `Tooltip` de shadcn. El escenario del vídeo es negro a propósito, como cualquier reproductor, y es la única excepción a la regla de colores.

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
- **Marcas en la barra** (SoundCloud): un punto por nota; un `Tooltip` controlado muestra tiempo y texto al pasar el ratón en escritorio y, en móvil, al tocar (un toque abre y selecciona, otro cierra). Tocar además pausa y salta ahí.
- **Modo repetir** (recorte de vídeo de Fotos en iPhone): al entrar aparece bajo el vídeo una tira de fotogramas (`src/app/v/[id]/filmstrip.tsx`, extraídos en el navegador con un `<video>` oculto y un `<canvas>`) con un marco verde que marca el trozo. Los extremos del marco son dos asas gruesas que se arrastran; fuera del trozo la tira se atenúa y dentro se ve el cabezal. Al entrar, el trozo son 6 s desde el punto actual y ya se repite. Ajuste fino con ±1 s en `ButtonGroup`. Se ocultan las marcas de notas. Se sale con "Salir" o Esc. Ninguna instrucción de "tocar aquí": el trozo siempre está visible y solo se ajusta.
- **Sin sonido**: un `Toggle` junto a Reproducir silencia el vídeo, para ensayar sin música o en sitios donde no se puede oír. La preferencia se guarda en el dispositivo con `usePersistedBoolean` (`src/hooks/`), un hook sobre `useSyncExternalStore` seguro para hidratación.
- **Portada**: la miniatura del vídeo hace de `poster`, así se ve el primer fotograma antes de darle a play (como YouTube y Vimeo).

## Jerarquía de datos

Escuela → Curso (nombre, día, hora) → Clase o sesión (fecha, título) → Vídeo → Nota (segundo, autor, rol). Solo profes y admin suben vídeos y escriben notas. La lectura es pública.
