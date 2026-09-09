import { useEffect, useState } from 'react';

/**
 * Devuelve el valor recibido, pero solo despues de que haya dejado de cambiar
 * durante `demoraMs`.
 *
 * Para que sirve: separar lo que el usuario escribe de lo que se consulta. El
 * campo de busqueda tiene que responder a cada tecla -si no, se siente
 * trabado-, pero la consulta no: buscar "rodriguez" son nueve consultas de las
 * cuales ocho se descartan, y cada una recorre la tabla entera.
 *
 * El valor inicial se devuelve tal cual, sin esperar: la primera carga no
 * tiene por que demorarse.
 */
export function useValorDemorado<T>(valor: T, demoraMs = 300): T {
  const [demorado, setDemorado] = useState(valor);

  useEffect(() => {
    if (valor === demorado) return;

    const t = setTimeout(() => setDemorado(valor), demoraMs);
    return () => clearTimeout(t);
    // `demorado` no va en las dependencias a proposito: incluirlo relanzaria
    // el temporizador al asentarse el valor, y con el la limpieza, dejando un
    // ciclo de efectos que no cambia nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, demoraMs]);

  return demorado;
}
