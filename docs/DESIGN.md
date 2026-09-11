# Compás: sistema de diseño

Cómo se ve y se comporta la interfaz. Todo lo que se construya nuevo usa esto y nada más. La maqueta original está en `docs/design-system.html`; la implementación vive en `src/app/globals.css` y se consume como utilidades de Tailwind.

## Principios

1. **La sala está a oscuras.** El vídeo es lo único iluminado, así que la interfaz es oscura y el color solo aparece donde significa algo.
2. **Se usa de pie, con prisa y con las manos sudadas.** Áreas de toque de 44 px como mínimo. Subir un vídeo tiene un presupuesto de diez segundos.
3. **Cinco tamaños de texto.** Más de cinco y la jerarquía deja de leerse.
4. **El radio codifica jerarquía.** No es el mismo en todo.
5. **Movimiento solo como respuesta a un toque.** Saltar a un minuto debe sentirse instantáneo, no animado. Se respeta `prefers-reduced-motion`.

## Color

| Token | Utilidad Tailwind | Valor | Significado |
|---|---|---|---|
| `--color-ink` | `bg-ink` | `#14101A` | Sala: fondo de página |
| `--color-ink-2` | `bg-ink-2` | `#1F1926` | Superficie: tarjetas |
| `--color-ink-3` | `bg-ink-3`, `border-ink-3` | `#2B2333` | Separadores suaves, fondos de etiqueta |
| `--color-line` | `border-line` | `#3B3145` | Bordes |
| `--color-stage` | `bg-stage` | `#0C0910` | Escenario: fondo del vídeo |
| `--color-paper` | `text-paper` | `#F3EEE7` | Texto |
| `--color-paper-dim` | `text-paper-dim` | `#A99EB4` | Texto secundario |
| `--color-brass` | `text-brass` | `#E6B44C` | **Corrección**: lo que dice quien enseña. También foco y acción principal |
| `--color-rosa` | `text-rosa` | `#E04F7B` | **Duda**: lo que pregunta quien aprende. También error |
| `--color-verde` | `text-verde` | `#5FBF8F` | **Resuelto**: hecho, subido, nuevo |

Regla: brass, rosa y verde no se usan como decoración. Si un elemento no es una corrección, una duda o algo resuelto, va en paper o paper-dim.

## Tipografía

| Uso | Familia | Peso | Utilidad |
|---|---|---|---|
| Titulares | Bricolage Grotesque | 500 | `font-disp` (automático en `h1`, `h2`, `h3`) |
| Marca | Bricolage Grotesque | 700 | `.mark` |
| Interfaz | Manrope | 400 y 600 | `font-sans` (por defecto en `body`) |

Las fuentes se cargan con `next/font/google` en `src/app/layout.tsx` y se exponen como `--font-manrope` y `--font-bricolage`.

### Escala

| Utilidad | Tamaño | Dónde |
|---|---|---|
| `text-mini` | 11,5 px | Marcas de tiempo, etiquetas, quién habla |
| `text-small` | 13,5 px | Casi todo el texto de la app: filas, notas, botones |
| `text-body` | 15 px | Párrafos |
| `text-lede` | 19 px | Entradillas, títulos de sección en listas |
| `text-display` | 31 px | Título de página, cifras grandes |

No se usan `text-xs`, `text-sm`, `text-lg` ni tamaños arbitrarios.

## Radio

| Utilidad | Valor | Dónde |
|---|---|---|
| `rounded-phone` | 26 px | Contenedor tipo teléfono (maquetas) |
| `rounded-card` | 16 px | Tarjetas, escenario del vídeo |
| `rounded-chip` | 20 px | Chips, botones, badges, tags |
| `rounded-stamp` | 4 px | Marcas de tiempo |

## Componentes

Clases CSS en `src/app/globals.css`, capa `components`. Se combinan con utilidades de Tailwind para márgenes y layout.

| Clase | Qué es | Variantes |
|---|---|---|
| `.btn` | Botón, 44 px de alto mínimo | `.btn-primary` en brass para la acción principal de la pantalla. Una por pantalla |
| `.chip` | Filtro o estado seleccionable | `aria-pressed="true"` o `.on` lo pone en brass translúcido |
| `.stamp` | Marca de tiempo o quién habla | `.stamp-prof` brass, `.stamp-alum` rosa |
| `.badge` | Estado positivo | Siempre verde: "3 notas nuevas", "listo" |
| `.tag` | Rol de una persona | `.tag-p` en brass para profe y admin |
| `.card` | Superficie con borde | Fondo ink-2, borde line, radio card |
| `.field` | Campo de formulario | 44 px de alto, fondo ink |
| `.notice` | Aviso | `.notice-rosa` error, `.notice-brass` advertencia, `.notice-verde` hecho |
| `.prog` | Barra de progreso | `<div class="prog"><i style="width:45%"></i></div>`, relleno verde |
| `.row` + `.thumb` | Fila de lista de 81 px con miniatura 86×57 | Caben ocho clases en pantalla sin desplazar. `<i>` dentro de `.thumb` para la duración |
| `.av` | Avatar de iniciales | `.av-p` en brass para profe y admin |
| `.mark` | Marca "Compás" | `Comp<em>á</em>s`, la tilde en brass |

## Pantallas

- **Lista** (`/`): agrupada por fecha de clase, porque la alumna busca un día, no un archivo. Fecha en `text-lede`, filas `.row` dentro de una `.card`.
- **Reproductor** (`/v/[id]`): escenario `bg-stage` con `rounded-card`. Debajo, chips de velocidad y de bucle. La nota del profe va en una `.card` con `.stamp-prof`.
- **Subir** (`/subir`): un `.card` con campos `.field`, progreso `.prog`, errores `.notice-rosa`, avisos `.notice-brass`, y un solo `.btn-primary`.
- **Personas** (`/admin`): cifras en `text-display` sobre `bg-ink-2`, filas con `.av` y `.tag`.
- **Entrar** (`/login`): un `.card` centrado con un `.btn-primary`.

## Cómo añadir algo nuevo

1. Mira si existe un componente en la tabla. Si existe, úsalo.
2. Si necesitas un color, pregúntate qué significa. Si no es corrección, duda o resuelto, es paper o paper-dim.
3. Elige el tamaño de texto entre los cinco de la escala.
4. Si es tocable, 44 px de alto como mínimo.
5. Si necesitas un componente nuevo, añádelo a `globals.css` en la capa `components` y a la tabla de arriba, en el mismo commit.
