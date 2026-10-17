type ResultadoPagina<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function traerTodo<T>(
  consultar: (desde: number, hasta: number) => Promise<ResultadoPagina<T>>,
  tamano = 1000,
): Promise<T[]> {
  const acumulado: T[] = [];
  let desde = 0;

  while (true) {
    const hasta = desde + tamano - 1;
    const { data, error } = await consultar(desde, hasta);
    if (error) {
      throw new Error(error.message);
    }
    const filas = data ?? [];
    acumulado.push(...filas);
    if (filas.length < tamano) break;
    desde += tamano;
  }

  return acumulado;
}

export function enLotes<T>(ids: readonly T[], tamano = 200): T[][] {
  if (ids.length === 0) return [];
  const lotes: T[][] = [];
  for (let i = 0; i < ids.length; i += tamano) {
    lotes.push(ids.slice(i, i + tamano));
  }
  return lotes;
}
