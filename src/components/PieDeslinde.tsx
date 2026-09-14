import Link from "next/link";

export default function PieDeslinde() {
  return (
    <footer className="bg-sky-950 px-4 py-3 text-center text-xs text-sky-100">
      Proyecto ciudadano independiente. No es un canal oficial de COMAPA ni de ningún organismo público. {" "}
      <Link className="underline" href="/privacidad">
        Aviso de privacidad
      </Link>
    </footer>
  );
}
