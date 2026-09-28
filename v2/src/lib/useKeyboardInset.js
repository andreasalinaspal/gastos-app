import { useEffect, useState } from "react";

// Cuánto de la pantalla está tapando el teclado, en píxeles.
//
// En iOS el teclado NO encoge el viewport de layout, así que una hoja anclada
// con `bottom: 0` queda escondida detrás del teclado (justo lo que pasaba al
// abrir "Nuevo gasto", que además enfoca el monto solo). La API visualViewport
// sí reporta el área realmente visible, y con eso levantamos la hoja.
//
// Devuelve 0 cuando no hay teclado, cuando el navegador no soporta la API, o
// durante el render del servidor.
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const actualizar = () => {
      // Lo que queda por debajo del área visible = teclado (o barra del navegador).
      const tapado = window.innerHeight - vv.height - vv.offsetTop;
      // Por debajo de ~120px suele ser la barra de Safari, no el teclado.
      setInset(tapado > 120 ? Math.round(tapado) : 0);
    };

    actualizar();
    vv.addEventListener("resize", actualizar);
    vv.addEventListener("scroll", actualizar);
    return () => {
      vv.removeEventListener("resize", actualizar);
      vv.removeEventListener("scroll", actualizar);
    };
  }, []);

  return inset;
}

// Estilo de hoja inferior que se levanta sobre el teclado y deja su contenido
// desplazable en el espacio que queda.
export function sheetStyle(inset, extra = {}) {
  return {
    position: "absolute",
    bottom: inset,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 430,
    background: "#fff",
    borderRadius: "28px 28px 0 0",
    padding: inset > 0 ? "16px 24px 20px" : "16px 24px 40px",
    maxHeight: inset > 0 ? `calc(100vh - ${inset + 24}px)` : "88vh",
    overflowY: "auto",
    transition: "bottom 0.2s ease",
    animation: "slideUp 0.3s ease",
    ...extra,
  };
}
