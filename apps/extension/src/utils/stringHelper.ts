export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getLevenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  // La matriz se recorre siempre dentro de sus propias cotas, asi que las
  // filas existen por construccion. Se toman por referencia en vez de
  // indexar dos veces: ademas de quitarle el trabajo al compilador, evita
  // repetir `matrix[j]` en cada acceso.
  const matrix: number[][] = Array.from({ length: b.length + 1 }, () =>
    new Array<number>(a.length + 1).fill(0),
  );

  const primeraFila = matrix[0] as number[];
  for (let i = 0; i <= a.length; i++) primeraFila[i] = i;
  for (let j = 0; j <= b.length; j++) (matrix[j] as number[])[0] = j;

  for (let j = 1; j <= b.length; j++) {
    const fila = matrix[j] as number[];
    const filaPrevia = matrix[j - 1] as number[];

    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      fila[i] = Math.min(
        (fila[i - 1] as number) + 1,
        (filaPrevia[i] as number) + 1,
        (filaPrevia[i - 1] as number) + cost,
      );
    }
  }

  return (matrix[b.length] as number[])[a.length] as number;
}
