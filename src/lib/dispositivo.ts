"use client";

import { useSyncExternalStore } from "react";

const CLAVE_TOKEN = "ojo_token";
const CLAVE_FOLIOS = "ojo_folios";

export function obtenerTokenDispositivo() {
  let token = localStorage.getItem(CLAVE_TOKEN);

  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(CLAVE_TOKEN, token);
  }

  return token;
}

export function guardarFolioReciente(folio: string) {
  const folios = leerFoliosRecientes().filter((folioGuardado) => folioGuardado !== folio);
  folios.unshift(folio);
  guardarListaLocal(CLAVE_FOLIOS, folios.slice(0, 10));
}

export function leerFoliosRecientes() {
  try {
    const valor = localStorage.getItem(CLAVE_FOLIOS);
    const folios = valor ? JSON.parse(valor) : [];
    return Array.isArray(folios) ? folios.filter((folio): folio is string => typeof folio === "string") : [];
  } catch {
    return [];
  }
}

// --- Leer listas de localStorage desde componentes ---
// React no permite leer localStorage durante el render (en el servidor no existe)
// ni llamar setState directo en un useEffect. useSyncExternalStore es la forma
// oficial: en el servidor devuelve la lista vacía y en el navegador la real.

const LISTA_VACIA: string[] = [];
const EVENTO_CAMBIO = "ojo-lista-local";
const cacheListas = new Map<string, { crudo: string | null; lista: string[] }>();

function leerListaLocal(clave: string) {
  const crudo = localStorage.getItem(clave);
  const enCache = cacheListas.get(clave);
  // Devolver el mismo arreglo si no cambió: React compara por referencia.
  if (enCache && enCache.crudo === crudo) return enCache.lista;
  let lista: string[] = LISTA_VACIA;
  try {
    const valor = crudo ? JSON.parse(crudo) : [];
    if (Array.isArray(valor)) lista = valor.filter((elemento): elemento is string => typeof elemento === "string");
  } catch {
    lista = LISTA_VACIA;
  }
  cacheListas.set(clave, { crudo, lista });
  return lista;
}

export function guardarListaLocal(clave: string, lista: string[]) {
  localStorage.setItem(clave, JSON.stringify(lista));
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

function suscribirCambios(avisar: () => void) {
  window.addEventListener(EVENTO_CAMBIO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

export function useListaLocal(clave: string) {
  return useSyncExternalStore(suscribirCambios, () => leerListaLocal(clave), () => LISTA_VACIA);
}

export function useFoliosRecientes() {
  return useListaLocal(CLAVE_FOLIOS);
}
