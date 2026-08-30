-- normalizar_nombres_en_blanco
--
-- NOTA DE NUMERACION, 2026-08-30.
--
-- Esta migracion se escribio y se aplico el 2026-08-21, pero solo existia en
-- `supabase/migrations/`, el arbol que ve el CLI. Nunca tuvo original numerado
-- aca, asi que `sql/migrations/` -que es la fuente autoritativa- no la
-- describia: leyendo solo esa carpeta era imposible saber que el trigger
-- existia en la base.
--
-- Se recupera con el numero 137, el siguiente libre, y no con uno alrededor de
-- 130 que respetara la cronologia: el orden real de aplicacion lo fija la marca
-- de tiempo del espejo, no este numero, y renumerar lo ya aplicado seria peor
-- mentira que un numero fuera de orden.
--
-- Contenido identico al del espejo. Ya esta aplicada: no vuelve a correr.

-- Nombres que son solo espacios pasan a cadena vacia.
--
-- El filtro "ocultar leads sin nombre" de la tabla de leads se resuelve en la
-- consulta, porque esa tabla pagina en servidor y filtrar en el cliente daria
-- una pagina corta y un total que no cuadra.
--
-- PostgREST filtra sobre la columna y no sobre una expresion, asi que desde la
-- aplicacion se puede pedir `name <> ''` pero no `btrim(name) <> ''`. Un nombre
-- hecho de espacios se colaria por ese hueco y la tabla de leads discreparia
-- del resto de las listas, que si lo tratan como ausente.
--
-- Se cierra en el dato en vez de en la consulta: un nombre de un solo espacio
-- no es un nombre, y guardarlo como tal es lo que crea la ambiguedad. Vienen
-- de importaciones de CSV con celdas en blanco.

UPDATE leads
SET name = ''
WHERE name IS NOT NULL
  AND name <> ''
  AND btrim(name) = '';

-- Y que no vuelvan a entrar.
--
-- El trigger normaliza en la escritura en lugar de dejarlo a cada punto de
-- entrada: hoy son el formulario, la importacion de CSV y los formularios
-- publicos, y manana sera otro mas que nadie recordara ajustar.
CREATE OR REPLACE FUNCTION normalizar_nombre_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.name IS NOT NULL AND btrim(NEW.name) = '' THEN
    NEW.name := '';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_normalizar_nombre ON leads;
CREATE TRIGGER leads_normalizar_nombre
  BEFORE INSERT OR UPDATE OF name ON leads
  FOR EACH ROW
  EXECUTE FUNCTION normalizar_nombre_lead();
