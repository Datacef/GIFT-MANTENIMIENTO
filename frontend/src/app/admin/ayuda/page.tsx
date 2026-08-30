'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import Swal from 'sweetalert2';
import { MdSearch, MdMenuBook, MdSend, MdSmartToy, MdRefresh } from 'react-icons/md';
import { GUIA_USUARIO, CATEGORIAS_GUIA, buscarSecciones, SeccionGuia } from 'content/guia-usuario';

/** Renderiza markdown ligero: ## titulo, - vineta, > nota, **negrita**, `codigo`. */
function MarkdownLigero({ texto }: { texto: string }) {
  const lineas = texto.split('\n');
  const nodos: ReactNode[] = [];
  const inline = (s: string, key: string) => {
    const partes = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
    return partes.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={`${key}-${i}`} className="rounded bg-gray-100 px-1 py-0.5 text-[12px] dark:bg-navy-900">{p.slice(1, -1)}</code>;
      return <span key={`${key}-${i}`}>{p}</span>;
    });
  };
  lineas.forEach((linea, i) => {
    const t = linea.trim();
    if (!t) return;
    if (t.startsWith('## ')) {
      nodos.push(<h4 key={i} className="mb-2 mt-4 text-base font-bold text-navy-700 first:mt-0 dark:text-white">{t.slice(3)}</h4>);
    } else if (t.startsWith('> ')) {
      nodos.push(
        <div key={i} className="my-2 rounded-lg border-l-4 border-brand-500 bg-brand-50 px-3 py-2 text-sm text-gray-700 dark:bg-navy-900 dark:text-gray-300">
          {inline(t.slice(2), `n${i}`)}
        </div>
      );
    } else if (t.startsWith('- ')) {
      nodos.push(
        <div key={i} className="mb-1 flex gap-2 pl-2 text-sm text-gray-700 dark:text-gray-300">
          <span className="text-brand-500">•</span>
          <span>{inline(t.slice(2), `n${i}`)}</span>
        </div>
      );
    } else {
      nodos.push(<p key={i} className="mb-2 text-sm text-gray-700 dark:text-gray-300">{inline(t, `n${i}`)}</p>);
    }
  });
  return <div>{nodos}</div>;
}

interface MensajeChat {
  rol: 'usuario' | 'asistente';
  texto: string;
  disponible?: boolean;
}

const AyudaPage = () => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const user = Parse.User.current();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    setAuthorized(true);
    setAuthLoading(false);
  }, [router]);

  // Buscador y navegacion
  const [busqueda, setBusqueda] = useState('');
  const [seccionActiva, setSeccionActiva] = useState<SeccionGuia>(GUIA_USUARIO[0]);

  const resultados = useMemo(() => {
    if (!busqueda.trim()) return null;
    return buscarSecciones(busqueda, 8).map((r) => r.seccion);
  }, [busqueda]);

  const listaVisible = resultados || GUIA_USUARIO;

  // Asistente IA
  const [pregunta, setPregunta] = useState('');
  const [chat, setChat] = useState<MensajeChat[]>([]);
  const [consultando, setConsultando] = useState(false);
  const chatFin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatFin.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const preguntar = async () => {
    const p = pregunta.trim();
    if (p.length < 3 || consultando) return;
    setPregunta('');
    setChat((c) => [...c, { rol: 'usuario', texto: p }]);
    setConsultando(true);
    try {
      const top = buscarSecciones(p, 3);
      const contexto = top.map((r) => ({ titulo: r.seccion.titulo, contenido: r.seccion.contenido }));
      const resp: any = await Parse.Cloud.run('consultarAsistenteIA', { pregunta: p, contexto });
      if (resp && resp.disponible) {
        setChat((c) => [...c, { rol: 'asistente', texto: resp.respuesta || '(respuesta vacia)', disponible: true }]);
      } else {
        setChat((c) => [...c, { rol: 'asistente', texto: resp?.motivo || 'El asistente IA no esta disponible en este servidor.', disponible: false }]);
      }
    } catch (e: any) {
      setChat((c) => [...c, { rol: 'asistente', texto: e?.message || 'Error consultando al asistente.', disponible: false }]);
    } finally {
      setConsultando(false);
    }
  };

  if (authLoading || !authorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="flex items-center gap-2 text-xl font-bold text-navy-700 dark:text-white">
            <MdMenuBook className="h-6 w-6 text-brand-500" />
            Ayuda y Manual de Usuario
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Busca en el manual o preguntale al asistente (IA local, responde en base a esta documentacion)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px,1fr]">
        {/* Columna izquierda: buscador + indice */}
        <Card extra="flex h-fit flex-col p-4">
          <div className="relative mb-3">
            <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en la ayuda... (ej: baja, pauta, reporte)"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-brand-400 dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>
          {resultados && (
            <p className="mb-2 text-xs text-gray-400">
              {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} para "{busqueda}"
            </p>
          )}
          <div className="flex flex-col gap-3">
            {CATEGORIAS_GUIA.map((cat) => {
              const secciones = listaVisible.filter((s) => s.categoria === cat);
              if (secciones.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{cat}</p>
                  {secciones.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSeccionActiva(s)}
                      className={`mb-0.5 block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                        seccionActiva.id === s.id
                          ? 'bg-brand-500 font-semibold text-white'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy-700'
                      }`}
                    >
                      {s.titulo}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Columna derecha: contenido + asistente */}
        <div className="flex flex-col gap-5">
          <Card extra="p-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-500">{seccionActiva.categoria}</p>
            <h3 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">{seccionActiva.titulo}</h3>
            <MarkdownLigero texto={seccionActiva.contenido} />
          </Card>

          {/* Asistente */}
          <Card extra="flex flex-col p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-base font-bold text-navy-700 dark:text-white">
                <MdSmartToy className="h-5 w-5 text-brand-500" />
                Asistente del manual (IA local)
              </h4>
              {chat.length > 0 && (
                <button
                  onClick={() => setChat([])}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
                >
                  <MdRefresh className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              )}
            </div>

            <div className="mb-3 max-h-80 min-h-24 overflow-y-auto rounded-xl bg-gray-50 p-3 dark:bg-navy-900">
              {chat.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">
                  Haz una pregunta sobre el sistema (ej: "como importo mi inventario desde Excel")
                </p>
              ) : (
                chat.map((m, i) => (
                  <div key={i} className={`mb-2 flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                        m.rol === 'usuario'
                          ? 'bg-brand-500 text-white'
                          : m.disponible
                          ? 'bg-white text-gray-700 dark:bg-navy-700 dark:text-gray-200'
                          : 'bg-orange-50 text-orange-700 dark:bg-navy-700 dark:text-orange-300'
                      }`}
                    >
                      {m.texto}
                    </div>
                  </div>
                ))
              )}
              {consultando && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-sm text-gray-400 dark:bg-navy-700">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    Consultando al asistente...
                  </div>
                </div>
              )}
              <div ref={chatFin} />
            </div>

            <div className="flex gap-2">
              <input
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && preguntar()}
                placeholder="Escribe tu pregunta..."
                className="h-11 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-brand-400 dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              />
              <button
                onClick={preguntar}
                disabled={consultando || pregunta.trim().length < 3}
                className="flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                <MdSend className="h-4 w-4" />
                Preguntar
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              El asistente responde unicamente en base a este manual, usando un modelo de IA instalado en tu red. Si el servidor de IA no esta configurado, el buscador de la izquierda sigue funcionando con normalidad.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AyudaPage;
