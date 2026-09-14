"use client";

import dynamic from "next/dynamic";

// next/dynamic con ssr:false solo se permite en componentes de cliente,
// por eso este envoltorio existe aparte de la ficha (que es de servidor).
const MapaMini = dynamic(() => import("./MapaMini"), {
  ssr: false,
  loading: () => <div className="h-52 w-full animate-pulse rounded-2xl bg-sky-100" />,
});

export default MapaMini;
