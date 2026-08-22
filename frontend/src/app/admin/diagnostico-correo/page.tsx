'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import { BrevoDiagnosticoService, BrevoConfigEstado } from 'services/solicitudes/brevo-diagnostico.service';
import { MdCheckCircle, MdErrorOutline, MdSend, MdRefresh } from 'react-icons/md';

export default function DiagnosticoCorreoPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [config, setConfig] = useState<BrevoConfigEstado | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [destinatario, setDestinatario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ success: boolean; messageId?: string; error?: string } | null>(null);

  useEffect(() => {
    const u = Parse.User.current();
    if (!u) { router.push('/auth/sign-in'); return; }
    if ((u.get('accessLevel') || 1) >= 4) {
      setAuthorized(true);
      setDestinatario(u.get('email') || '');
    } else router.push('/admin/default');
    setChecking(false);
  }, [router]);

  const cargarConfig = async () => {
    setLoadingConfig(true);
    try {
      const c = await BrevoDiagnosticoService.getEstado();
      setConfig(c);
    } catch (e: any) {
      console.error(e);
    } finally { setLoadingConfig(false); }
  };

  useEffect(() => { if (authorized) cargarConfig(); }, [authorized]);

  const enviarPrueba = async () => {
    if (!destinatario) return;
    setEnviando(true); setResultado(null);
    try {
      const r = await BrevoDiagnosticoService.enviarPrueba(destinatario);
      setResultado(r);
      setConfig(r.config);
    } catch (e: any) {
      setResultado({ success: false, error: e?.message || 'Error desconocido' });
    } finally { setEnviando(false); }
  };

  if (checking || !authorized) return null;

  const smtpOk = config && config.userDefinido && config.passDefinida;

  return (
    <div className="flex w-full flex-col gap-5 pt-5 lg:pt-10">
      <div>
        <h4 className="text-xl font-bold text-navy-700 dark:text-white">Diagnostico de Correo (Brevo SMTP)</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Herramienta para verificar la configuracion SMTP y disparar un correo de prueba.
        </p>
      </div>

      <Card extra="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h5 className="text-sm font-bold text-navy-700 dark:text-white">Estado de configuracion</h5>
          <button onClick={cargarConfig} className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600">
            <MdRefresh /> Refrescar
          </button>
        </div>

        {loadingConfig ? (
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        ) : !config ? (
          <p className="text-sm text-red-600">No se pudo obtener la configuracion.</p>
        ) : (
          <>
            <div className={`mb-4 flex items-center gap-2 rounded-lg p-3 text-sm ${smtpOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {smtpOk ? <MdCheckCircle className="h-5 w-5" /> : <MdErrorOutline className="h-5 w-5" />}
              <span>
                {smtpOk
                  ? 'Credenciales SMTP presentes. Prueba un envio real para confirmar.'
                  : 'Faltan credenciales SMTP (BREVO_SMTP_USER / BREVO_SMTP_PASS). Revisa .env y reinicia el contenedor backend-server.'}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <Row label="Host"><code>{config.host}</code></Row>
                <Row label="Puerto"><code>{config.port}</code></Row>
                <Row label="Usuario SMTP">{config.userPreview || <span className="text-red-600">no definido</span>}</Row>
                <Row label="Contrasena SMTP">{config.passDefinida ? <span className="text-green-600">definida</span> : <span className="text-red-600">no definida</span>}</Row>
                <Row label="Remitente"><code>{config.senderName} &lt;{config.senderEmail}&gt;</code></Row>
              </tbody>
            </table>
          </>
        )}
      </Card>

      <Card extra="p-5">
        <h5 className="mb-3 text-sm font-bold text-navy-700 dark:text-white">Enviar correo de prueba</h5>
        <div className="flex gap-2">
          <input
            type="email"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            placeholder="destinatario@ejemplo.com"
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-navy-600 dark:bg-navy-800 dark:text-white"
          />
          <button
            onClick={enviarPrueba}
            disabled={enviando || !destinatario || !smtpOk}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <MdSend /> {enviando ? 'Enviando...' : 'Enviar prueba'}
          </button>
        </div>

        {resultado && (
          <div className={`mt-4 rounded-lg p-3 text-sm ${resultado.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {resultado.success ? (
              <>
                <MdCheckCircle className="mr-1 inline h-4 w-4" />
                Correo aceptado por el servidor SMTP. Message ID: <code>{resultado.messageId}</code>
                <p className="mt-1 text-xs text-gray-600">
                  Revisa tambien la carpeta de spam. Si no llega en 5 min, verifica que el dominio del remitente este verificado en Brevo.
                </p>
              </>
            ) : (
              <>
                <MdErrorOutline className="mr-1 inline h-4 w-4" />
                Error: <code>{resultado.error}</code>
              </>
            )}
          </div>
        )}
      </Card>

      <Card extra="p-5 bg-blue-50 dark:bg-navy-900 border-l-4 border-blue-500">
        <h5 className="mb-2 text-sm font-bold text-blue-800 dark:text-blue-200">Checklist si los correos no llegan</h5>
        <ol className="space-y-1 text-sm text-blue-900 dark:text-blue-100 list-decimal pl-5">
          <li>Verificar que en <code>.env</code> existen <code>BREVO_SMTP_USER</code>, <code>BREVO_SMTP_PASS</code>, <code>BREVO_SENDER_EMAIL</code>.</li>
          <li>Reconstruir el backend para que instale <code>nodemailer</code>: <code>docker compose up --build backend-server</code>.</li>
          <li>Revisar los logs del contenedor <code>mmtto-backend</code> — al enviar un correo deberian aparecer lineas <code>[BrevoMailer]</code>.</li>
          <li>En el panel Brevo, verificar que el dominio del remitente este validado (SPF/DKIM).</li>
          <li>Si los correos siguen sin llegar: revisar bandeja de spam del destinatario.</li>
        </ol>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-gray-100 dark:border-navy-700">
      <td className="py-2 pr-4 text-gray-500">{label}</td>
      <td className="py-2 text-navy-700 dark:text-gray-300">{children}</td>
    </tr>
  );
}
