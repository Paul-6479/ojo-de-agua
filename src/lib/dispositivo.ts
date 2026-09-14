"use client";

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
  localStorage.setItem(CLAVE_FOLIOS, JSON.stringify(folios.slice(0, 10)));
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
