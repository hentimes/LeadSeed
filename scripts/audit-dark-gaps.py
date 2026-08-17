"""Colores claros fijos sin contraparte oscura en el mismo className.

En modo oscuro un `bg-white` sin `dark:bg-*` al lado se pinta blanco de verdad,
y el texto de encima suele ser claro porque los tokens ya cambiaron. El
resultado es texto claro sobre blanco.
"""
import io, re, glob, os, sys

CLAROS = [
    # Ampliado el 2026-08-16. Antes solo miraba cinco fondos, y por eso pasaban
    # 123 bloques con texto y bordes grises fijos sin contraparte oscura: en un
    # tema oscuro, un text-slate-400 sobre casi negro es ilegible. Lo
    # encontraron dos agentes por separado; el primer sondeo propio dio cero
    # por un escape mal puesto y estuvo a punto de cerrarse como falsa alarma.
    (r'\b(?:bg)-(?:slate|gray|zinc|neutral|stone)-(?:50|100|200)\b', 'bg-', 'fondo gris claro fijo'),
    (r'\b(?:border)-(?:slate|gray|zinc|neutral|stone)-(?:100|200|300)\b', 'border-', 'borde claro fijo'),
    (r'\b(?:text)-(?:slate|gray|zinc|neutral|stone)-(?:300|400|500)\b', 'text-', 'texto gris fijo'),
    (r'\bbg-white\b', 'bg-', 'fondo blanco fijo'),
    (r'\bbg-gray-50\b', 'bg-', 'fondo gris muy claro fijo'),
    (r'\bbg-slate-50\b', 'bg-', 'fondo gris muy claro fijo'),
    (r'\bbg-gray-100\b', 'bg-', 'fondo gris claro fijo'),
    (r'\bbg-slate-100\b', 'bg-', 'fondo gris claro fijo'),
]

def clases_de(codigo):
    """(linea, lista de clases) por cada className del archivo."""
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
            trozo = codigo[i:j + 1]
        elif codigo[i] in '"\'':
            j = codigo.index(codigo[i], i + 1)
            trozo = codigo[i:j + 1]
        else:
            continue
        linea = codigo[:i].count('\n') + 1
        fuera.append((linea, trozo))
    return fuera


hallazgos = []
for p in glob.glob('src/**/*.tsx', recursive=True):
    p = p.replace(os.sep, '/')
    codigo = io.open(p, encoding='utf-8').read()
    for linea, trozo in clases_de(codigo):
        for patron, prefijo, desc in CLAROS:
            if not re.search(patron, trozo):
                continue
            # ¿hay alguna clase dark: del mismo tipo en el mismo bloque?
            if re.search(r'dark:(hover:)?' + re.escape(prefijo), trozo):
                continue
            hallazgos.append((p.replace('src/', ''), linea, desc,
                              re.search(patron, trozo).group(0)))
            break

por_archivo = {}
for f, l, d, c in hallazgos:
    por_archivo.setdefault(f, []).append((l, c))

print('%d bloques con color claro fijo y sin contraparte oscura\n' % len(hallazgos))
for f in sorted(por_archivo, key=lambda k: -len(por_archivo[k])):
    ls = por_archivo[f]
    print('%2d  %-52s %s' % (len(ls), f, ', '.join('%s:%d' % (c, l) for l, c in ls[:4])))

# Salir con error si hay hallazgos. Hasta el `2026-08-15` esto solo imprimia, y
# un detector que siempre sale con codigo 0 no sirve como guarda: el CI lo daba
# por bueno con cualquier resultado. Se llego a cero hallazgos el `2026-08-14`;
# a partir de aqui una reaparicion rompe la construccion en vez de pasar
# desapercibida, que es justo como se colo la primera vez.
sys.exit(1 if hallazgos else 0)
