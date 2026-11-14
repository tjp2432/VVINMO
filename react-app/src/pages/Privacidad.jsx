import { Link } from 'react-router-dom';

// Politica de Privacidad. El sitio no guarda datos: el formulario de contacto
// solo arma un mensaje y abre WhatsApp, por eso el texto lo aclara.
export default function Privacidad(){
  return (
    <article className="legal-page">
      <h1>Política de Privacidad</h1>
      <p className="legal-updated">Última actualización: Noviembre de 2026</p>

      <p>
        En Verónica Villafañe Inmobiliaria Integral (Matrícula CUCICBA Nº 7091), respetamos la
        privacidad de quienes visitan nuestro sitio web y protegemos la información personal
        conforme a la Ley N° 25.326 de Protección de Datos Personales de la República Argentina.
      </p>

      <h2>1. Recolección y tratamiento de datos</h2>
      <p>
        Este sitio web tiene fines exclusivamente informativos y de contacto comercial. No
        almacenamos bases de datos ni guardamos información personal en nuestros servidores a
        través de nuestro formulario de contacto. Al completar el formulario y presionar el botón
        de envío, el sistema únicamente genera un mensaje predefinido y redirige al usuario a la
        aplicación externa WhatsApp para iniciar una conversación directa con nuestro equipo.
      </p>

      <h2>2. Finalidad del contacto</h2>
      <p>
        Los datos que el usuario decida enviar voluntariamente a través de WhatsApp o correo
        electrónico (nombre, teléfono, correo electrónico y detalle de la consulta) serán
        utilizados únicamente para responder consultas, coordinar visitas y brindar asesoramiento
        inmobiliario. No cedemos, vendemos ni compartimos datos personales con terceros ajenos a
        la gestión solicitada.
      </p>

      <h2>3. Enlaces a sitios y plataformas de terceros</h2>
      <p>
        Nuestro sitio web contiene enlaces externos que redirigen a plataformas de terceros (como
        WhatsApp, Zonaprop y Google Maps) para facilitar la visualización de publicaciones,
        ubicaciones o el contacto directo. Una vez que el usuario abandona nuestro sitio e ingresa
        a dichas plataformas, el tratamiento de sus datos pasa a regirse por las políticas de
        privacidad propias de cada servicio.
      </p>

      <h2>4. Derechos del titular de los datos (ARCO)</h2>
      <p>
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso,
        rectificación, actualización o supresión de sus datos de contacto en cualquier momento y
        de forma gratuita, enviando una solicitud por correo electrónico a{' '}
        <a href="mailto:info@veronicavillafane.com">info@veronicavillafane.com</a>.
      </p>

      <h2>5. Órgano de Control</h2>
      <p>
        La Agencia de Acceso a la Información Pública (AAIP), en su carácter de Órgano de Control
        de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que
        interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas
        vigentes en materia de protección de datos personales.
      </p>

      <p className="legal-back">
        <Link to="/" className="btn">Volver al inicio</Link>
      </p>
    </article>
  );
}
