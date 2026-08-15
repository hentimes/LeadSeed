"""Sustituye colores claros fijos por los tokens del sistema.

Dos pasos, y el segundo es el que da sentido al item del roadmap:

1. La clase base pasa a su token equivalente (`bg-white` -> `bg-surface`).
2. Se elimina el `dark:` de la MISMA propiedad en el mismo `className`, porque
   el token ya resuelve el tema. Dejarlo haria que el ad-hoc pisara al token
   justo en modo oscuro, que es lo que se quiere arreglar.

No toca:
  - `text-slate-300`: no tiene token equivalente cercano; el mas parecido es
    mucho mas oscuro y son iconos decorativos.
  - `hover:bg-slate-800` y similares oscuros: no son colores claros fijos.
"""
import io, re, sys

MAPA = [
    ('bg-white', 'bg-surface', 'bg'),
    ('bg-slate-50', 'bg-surface-muted', 'bg'),
    ('bg-gray-50', 'bg-surface-hover', 'bg'),
    ('bg-slate-100', 'bg-surface-hover', 'bg'),
    ('bg-gray-100', 'bg-surface-hover', 'bg'),
    ('border-slate-200', 'border-line', 'border'),
    ('border-slate-100', 'border-line', 'border'),
    ('border-gray-200', 'border-line', 'border'),
    ('border-gray-100', 'border-line', 'border'),
    ('border-slate-300', 'border-line-strong', 'border'),
    ('text-slate-800', 'text-ink', 'text'),
    ('text-gray-800', 'text-ink', 'text'),
    ('text-slate-700', 'text-ink', 'text'),
    ('text-gray-700', 'text-ink', 'text'),
    ('text-slate-600', 'text-ink-secondary', 'text'),
    ('text-gray-600', 'text-ink-secondary', 'text'),
    ('text-slate-500', 'text-ink-secondary', 'text'),
    ('text-gray-500', 'text-ink-secondary', 'text'),
    ('text-slate-400', 'text-ink-muted', 'text'),
    ('text-gray-400', 'text-ink-muted', 'text'),
]

PREFIJOS = r'(?:hover:|focus:|focus-within:|group-hover:|active:)?'


def bloques_className(codigo):
    """(inicio, fin) de cada valor de className."""
    fuera = []
    for m in re.finditer(r'className\s*=\s*', codigo):
        i = m.end()
        if codigo[i] == '{':
            nivel = 0
            j = i
            while j < len(codigo):
                if codigo[j] == '{':
                    nivel += 1
                elif codigo[j] == '}':
                    nivel -= 1
                    if nivel == 0:
                        break
                j += 1
            fuera.append((i, j + 1))
        elif codigo[i] in '"\'':
            j = codigo.index(codigo[i], i + 1)
            fuera.append((i, j + 1))
    return fuera


def procesar(texto):
    cambios = 0
    quitados = 0
    propiedades_tocadas = set()

    for viejo, nuevo, prop in MAPA:
        patron = re.compile(r'(?<![\w-])(' + PREFIJOS + r')' + re.escape(viejo) + r'(?![\w-])')
        texto, n = patron.subn(lambda m: m.group(1) + nuevo, texto)
        if n:
            cambios += n
            propiedades_tocadas.add(prop)

    # El token ya resuelve el tema: el dark: de la misma propiedad sobra.
    for prop in propiedades_tocadas:
        patron = re.compile(r'\s*\bdark:(?:hover:|group-hover:)?' + prop + r'-[a-z0-9/\[\]#.-]+')
        texto, n = patron.subn('', texto)
        quitados += n

    return texto, cambios, quitados


total_c = total_q = 0
for p in sys.argv[1:]:
    codigo = io.open(p, encoding='utf-8').read()
    partes = []
    fin_anterior = 0
    c = q = 0
    for ini, fin in bloques_className(codigo):
        partes.append(codigo[fin_anterior:ini])
        nuevo, nc, nq = procesar(codigo[ini:fin])
        partes.append(nuevo)
        c += nc
        q += nq
        fin_anterior = fin
    partes.append(codigo[fin_anterior:])
    resultado = ''.join(partes)

    if resultado != codigo:
        io.open(p, 'w', encoding='utf-8').write(resultado)
    print('%-52s %3d tokenizadas, %2d dark: retirados' % (p.replace('src/', ''), c, q))
    total_c += c
    total_q += q

print('\nTOTAL: %d clases tokenizadas, %d dark: retirados' % (total_c, total_q))
