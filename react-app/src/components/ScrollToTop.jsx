import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Al cambiar de pagina, vuelve arriba de todo. Si la URL trae un ancla
// (/#contacto, /#nosotros) hace scroll hasta esa seccion.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}
