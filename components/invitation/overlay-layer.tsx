"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Registro de capas opacas a pantalla completa (la cortina de apertura y el
 * visor de fotos). El fondo ambiental lo consulta para detener su bucle mientras
 * algo lo tapa: dibujar debajo de una capa opaca es trabajo que nadie ve.
 *
 * Se modela como contador porque las capas son independientes entre sí y no
 * pueden pisarse el estado unas a otras.
 */
type FullScreenLayerApi = {
  /** Suma una capa abierta; devuelve la función que la libera. */
  acquire: () => () => void;
};

const FullScreenLayerContext = createContext<FullScreenLayerApi | null>(null);
const FullScreenLayerCountContext = createContext(0);

export function FullScreenLayerProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const acquire = useCallback(() => {
    setCount((current) => current + 1);
    return () => setCount((current) => Math.max(0, current - 1));
  }, []);

  const api = useMemo<FullScreenLayerApi>(() => ({ acquire }), [acquire]);

  return (
    <FullScreenLayerContext.Provider value={api}>
      <FullScreenLayerCountContext.Provider value={count}>
        {children}
      </FullScreenLayerCountContext.Provider>
    </FullScreenLayerContext.Provider>
  );
}

/**
 * Declara el componente como capa opaca a pantalla completa mientras esté
 * montado. Debe usarse en componentes que solo existen cuando la capa está
 * abierta (la cortina, el visor), no en un contenedor permanente.
 */
export function useFullScreenLayer(): void {
  const api = useContext(FullScreenLayerContext);
  useEffect(() => api?.acquire(), [api]);
}

/** Cuántas capas opacas a pantalla completa hay abiertas ahora mismo. */
export function useFullScreenLayerCount(): number {
  return useContext(FullScreenLayerCountContext);
}
