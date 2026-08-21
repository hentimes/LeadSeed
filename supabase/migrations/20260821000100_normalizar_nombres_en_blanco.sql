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
