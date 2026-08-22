'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import MantenimientoDomainSelector from 'components/admin/mantenimiento/MantenimientoDomainSelector';
import MantenimientoActivoSearch from 'components/admin/mantenimiento/MantenimientoActivoSearch';
import MantenimientoChecklist from 'components/admin/mantenimiento/MantenimientoChecklist';
import { ChecklistItemLocal } from 'components/admin/mantenimiento/MantenimientoChecklistItem';
import MantenimientoFotosAdicionales, {
  FotoLocal,
} from 'components/admin/mantenimiento/MantenimientoFotosAdicionales';
import MantenimientoSignaturePad from 'components/admin/mantenimiento/MantenimientoSignaturePad';
import { MantenimientoService } from 'services/mantenimiento.service';
import {
  ActivoBusquedaResult,
  TIPO_MANTENIMIENTO_OPTIONS,
  FotoAdicional,
} from 'types/mantenimiento.types';
import {
  MdCheck,
  MdArrowForward,
  MdArrowBack,
  MdSend,
  MdChecklist,
} from 'react-icons/md';
import Swal from 'sweetalert2';

// Step configuration — 5 steps now (added classification/pauta selection)
const ETAPAS = [
  { id: 0, titulo: 'Dominio y Activo', descripcion: 'Seleccione el dominio, busque el activo y defina el tipo de mantenimiento' },
  { id: 1, titulo: 'Seleccion de Pauta', descripcion: 'Seleccione la pauta de mantenimiento a aplicar' },
  { id: 2, titulo: 'Checklist', descripcion: 'Responda las preguntas de mantenimiento para el activo seleccionado' },
  { id: 3, titulo: 'Fotos', descripcion: 'Registre evidencia fotografica adicional (opcional)' },
  { id: 4, titulo: 'Observaciones y Firma', descripcion: 'Complete observaciones finales y firme el registro' },
];

// Map dominio to Parse class
const ACTIVO_CLASE: Record<string, string> = {
  equipoMedico: 'InventarioEquipoMedico',
  equipoIndustrial: 'InventarioEquipoIndustrial',
  flotaVehicular: 'InventarioFlotaVehicular',
  infraestructura: 'InventarioInfraestructura',
};

interface ClasificacionDisponible {
  clasificacion: string;
  cantidadPreguntas: number;
  categorias: string[];
}

const MantenimientoNuevoPage = () => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = Parse.User.current();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    const level = user.get('accessLevel') || 1;
    if (level >= 2) {
      setAuthorized(true);
    } else {
      router.push('/admin/default');
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!authorized) return null;

  return <WizardContent />;
};

const WizardContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = Parse.User.current();

  // Etapa 3.3 — Query params para entrada contextualizada desde el inventario
  const ctxDominio = searchParams?.get('dominio') || '';
  const ctxActivoId = searchParams?.get('activoId') || '';
  const ctxRetroactivo = searchParams?.get('retroactivo') === '1';
  const ctxPeriodoIndice = searchParams?.get('periodoIndice') || '';
  const ctxFechaSugerida = searchParams?.get('fechaSugerida') || '';

  // Wizard state
  const [etapa, setEtapa] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0 state
  const [dominio, setDominio] = useState(ctxDominio);
  const [selectedActivo, setSelectedActivo] = useState<ActivoBusquedaResult | null>(null);
  const [tipoMantenimiento, setTipoMantenimiento] = useState(ctxRetroactivo ? 'preventivo' : '');

  // Step 1 state — clasificacion/pauta selection
  const [clasificacionesDisponibles, setClasificacionesDisponibles] = useState<ClasificacionDisponible[]>([]);
  const [clasificacionSeleccionada, setClasificacionSeleccionada] = useState('');
  const [loadingClasificaciones, setLoadingClasificaciones] = useState(false);

  // Step 2 state
  const [checklist, setChecklist] = useState<ChecklistItemLocal[]>([]);
  const [checklistErrors, setChecklistErrors] = useState<Set<string>>(new Set());
  const [preguntasLoaded, setPreguntasLoaded] = useState(false);
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);

  // Step 3 state
  const [fotosAdicionales, setFotosAdicionales] = useState<Record<string, FotoLocal[]>>({});

  // Step 4 state
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [proximoMantenimiento, setProximoMantenimiento] = useState('');
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  // Etapa 7 — motivo de retroactividad (obligatorio si retroactivo=1)
  const [motivoRetroactivo, setMotivoRetroactivo] = useState('');

  // Etapa 8 — fecha editable del mantenimiento (default: hoy o fechaSugerida)
  // Usar fecha LOCAL del navegador (Chile/Santiago) — toISOString() devuelve UTC
  // y desplaza el dia tras las 21:00 hora local. Construimos YYYY-MM-DD manualmente.
  const hoyStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();
  const [fecha, setFecha] = useState<string>(ctxFechaSugerida || hoyStr);
  const tecnicoNombre = currentUser?.get('displayName') || currentUser?.get('username') || '';
  const tecnicoId = currentUser?.id || '';

  // Etapa 8 — fechaBase del activo seleccionado (para min del input date)
  const fechaBaseActivo = (() => {
    if (!selectedActivo) return '';
    // El campo viene en el resumen como "fechaAdquisicion" o "fechaInstalacion" segun la clase.
    // El servicio de busqueda no necesariamente lo expone; lo dejamos vacio si falta.
    return (selectedActivo as any).fechaBase || '';
  })();

  // Etapa 8 — info de retraso para banner informativo
  // Calcular usando fechas locales (no UTC) para evitar offset de zona horaria
  const diasDeRetraso = (() => {
    if (!fecha) return 0;
    const [fy, fm, fd] = fecha.split('-').map(Number);
    const [hy, hm, hd] = hoyStr.split('-').map(Number);
    if (!fy || !fm || !fd || !hy || !hm || !hd) return 0;
    const f = new Date(fy, fm - 1, fd);
    const h = new Date(hy, hm - 1, hd);
    return Math.round((h.getTime() - f.getTime()) / (24 * 60 * 60 * 1000));
  })();
  const esFechaRetroactiva = diasDeRetraso > 7;

  // Reset activo when dominio changes
  const handleDominioSelect = (d: string) => {
    if (d !== dominio) {
      setDominio(d);
      setSelectedActivo(null);
      setTipoMantenimiento('');
      setClasificacionesDisponibles([]);
      setClasificacionSeleccionada('');
      setChecklist([]);
      setPreguntasLoaded(false);
    }
  };

  // Reset checklist when activo or tipo changes
  const handleActivoSelect = (activo: ActivoBusquedaResult) => {
    setSelectedActivo(activo);
    setClasificacionesDisponibles([]);
    setClasificacionSeleccionada('');
    setChecklist([]);
    setPreguntasLoaded(false);
  };

  const handleTipoSelect = (tipo: string) => {
    setTipoMantenimiento(tipo);
    setClasificacionesDisponibles([]);
    setClasificacionSeleccionada('');
    setChecklist([]);
    setPreguntasLoaded(false);
  };

  // Load available classifications for dominio + tipoMantenimiento
  const loadClasificaciones = useCallback(async (): Promise<{ autoSkipped: boolean }> => {
    if (!dominio || !tipoMantenimiento) return { autoSkipped: false };
    setLoadingClasificaciones(true);
    try {
      const clasificaciones = await MantenimientoService.getClasificacionesConPreguntas(
        dominio,
        tipoMantenimiento
      );
      setClasificacionesDisponibles(clasificaciones);

      if (clasificaciones.length === 0) {
        return { autoSkipped: false };
      }

      // Pre-select pautaAsignada if it matches an available classification
      const pauta = selectedActivo?.pautaAsignada?.trim();
      if (pauta && pauta.length > 0) {
        const match = clasificaciones.find(
          (c) => c.clasificacion === pauta
        );
        if (match) {
          setClasificacionSeleccionada(match.clasificacion);
        }
      }

      // Never auto-skip — always show pauta selection step
      return { autoSkipped: false };
    } catch (error) {
      console.error('Error cargando clasificaciones:', error);
      return { autoSkipped: false };
    } finally {
      setLoadingClasificaciones(false);
    }
  }, [dominio, tipoMantenimiento, selectedActivo]);

  // Load questions for a specific clasificacion
  const loadPreguntasForClasificacion = async (clasificacion: string) => {
    if (!dominio || !tipoMantenimiento) return;
    setLoadingPreguntas(true);
    try {
      const preguntas = await MantenimientoService.getPreguntas(
        dominio,
        tipoMantenimiento,
        clasificacion
      );
      const items: ChecklistItemLocal[] = preguntas.map((p) => ({
        preguntaId: p.id,
        pregunta: p.pregunta,
        categoria: p.categoria,
        tipoRespuesta: p.tipoRespuesta,
        opcionesRespuesta: p.opcionesRespuesta,
        respuesta: '',
        estado: '',
        observaciones: '',
        foto: null,
        esCritica: p.esCritica,
        requiereFoto: p.requiereFoto,
        requiereObservacion: p.requiereObservacion,
        referenciaAcreditacion: p.referenciaAcreditacion,
      }));
      setChecklist(items);
      setPreguntasLoaded(true);
    } catch (error) {
      console.error('Error cargando preguntas:', error);
    } finally {
      setLoadingPreguntas(false);
    }
  };

  // --- Validation ---

  const validarEtapa0 = (): boolean => {
    if (!dominio) {
      Swal.fire('Atencion', 'Seleccione un dominio.', 'warning');
      return false;
    }
    if (!selectedActivo) {
      Swal.fire('Atencion', 'Busque y seleccione un activo.', 'warning');
      return false;
    }
    if (!tipoMantenimiento) {
      Swal.fire('Atencion', 'Seleccione el tipo de mantenimiento.', 'warning');
      return false;
    }
    return true;
  };

  const validarEtapa1 = (): boolean => {
    if (!clasificacionSeleccionada) {
      Swal.fire('Atencion', 'Seleccione una pauta de mantenimiento.', 'warning');
      return false;
    }
    return true;
  };

  const validarEtapa2 = (): boolean => {
    const errors = new Set<string>();
    checklist.forEach((item) => {
      if (!item.estado) {
        errors.add(item.preguntaId);
      }
      if (item.requiereFoto && !item.foto) {
        errors.add(item.preguntaId);
      }
      if (item.requiereObservacion && !item.observaciones?.trim()) {
        errors.add(item.preguntaId);
      }
    });
    setChecklistErrors(errors);
    if (errors.size > 0) {
      Swal.fire('Checklist incompleto', 'Complete todos los campos obligatorios resaltados en rojo.', 'warning');
      return false;
    }
    return true;
  };

  const validarFinal = (): boolean => {
    if (!firmaUrl) {
      Swal.fire('Atencion', 'La firma del tecnico es obligatoria. Use el boton "Guardar Firma".', 'warning');
      return false;
    }
    // Etapa 8 — validacion de fecha
    if (!fecha || !fecha.trim()) {
      Swal.fire('Fecha requerida', 'Indique la fecha en que se ejecuto el mantenimiento.', 'warning');
      return false;
    }
    if (fecha > hoyStr) {
      Swal.fire('Fecha invalida', 'La fecha del mantenimiento no puede ser futura.', 'warning');
      return false;
    }
    if (fechaBaseActivo && fecha < fechaBaseActivo) {
      Swal.fire(
        'Fecha invalida',
        `La fecha del mantenimiento no puede ser anterior a la fecha base del activo (${fechaBaseActivo}).`,
        'warning'
      );
      return false;
    }
    // Etapa 7+8 — Si la fecha es retroactiva (>7 dias atras) o el wizard fue invocado
    // con retroactivo=1, motivo es obligatorio
    const requiereMotivo = ctxRetroactivo || esFechaRetroactiva;
    if (requiereMotivo && !motivoRetroactivo.trim()) {
      Swal.fire(
        'Motivo retroactivo requerido',
        `Indique el motivo por el cual se registra este mantenimiento con ${diasDeRetraso} dias de retraso (ej: registro tardio por falla de conectividad).`,
        'warning'
      );
      return false;
    }
    return true;
  };

  // --- Navigation ---

  const handleSiguiente = async () => {
    if (etapa === 0) {
      if (!validarEtapa0()) return;
      // Load clasificaciones and pre-select pautaAsignada if available
      await loadClasificaciones();
      setEtapa(1);
    } else if (etapa === 1) {
      if (!validarEtapa1()) return;
      // Load questions for selected clasificacion
      if (!preguntasLoaded) {
        await loadPreguntasForClasificacion(clasificacionSeleccionada);
      }
      setEtapa(2);
    } else if (etapa === 2) {
      if (checklist.length > 0 && !validarEtapa2()) return;
      setEtapa(3);
    } else if (etapa === 3) {
      setEtapa(4);
    }
  };

  const handleAnterior = () => {
    if (etapa > 0) {
      setEtapa(etapa - 1);
    }
  };

  // Handle clasificacion selection in step 1
  const handleClasificacionSelect = (clasificacion: string) => {
    if (clasificacion !== clasificacionSeleccionada) {
      setClasificacionSeleccionada(clasificacion);
      setChecklist([]);
      setPreguntasLoaded(false);
    }
  };

  // --- Submit ---

  const handleSubmit = async () => {
    if (!validarFinal()) return;

    const confirmResult = await Swal.fire({
      title: 'Enviar a validacion',
      text: 'Se enviara el mantenimiento para validacion. Desea continuar?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#422AFB',
    });

    if (!confirmResult.isConfirmed) return;

    setSaving(true);
    try {
      // Upload checklist photos
      const uploadedChecklist = await Promise.all(
        checklist.map(async (item) => {
          let fotoUrl: string | undefined;
          if (item.foto?.file) {
            try {
              fotoUrl = await MantenimientoService.subirArchivoParse(
                item.foto.file,
                `checklist_${item.preguntaId}_${Date.now()}`
              );
            } catch (err) {
              console.error('Error subiendo foto checklist:', err);
            }
          }
          return {
            preguntaId: item.preguntaId,
            pregunta: item.pregunta,
            categoria: item.categoria,
            tipoRespuesta: item.tipoRespuesta,
            opcionesRespuesta: item.opcionesRespuesta,
            respuesta: item.respuesta,
            estado: item.estado,
            observaciones: item.observaciones,
            fotoUrl: fotoUrl || undefined,
            esCritica: item.esCritica,
            requiereFoto: item.requiereFoto,
            requiereObservacion: item.requiereObservacion,
            referenciaAcreditacion: item.referenciaAcreditacion,
          };
        })
      );

      // Upload additional photos
      const uploadedFotos: Record<string, FotoAdicional[]> = {};
      for (const [cat, fotos] of Object.entries(fotosAdicionales)) {
        if (fotos.length === 0) continue;
        uploadedFotos[cat] = await Promise.all(
          fotos.map(async (f) => {
            const url = await MantenimientoService.subirArchivoParse(
              f.file,
              `foto_${cat}_${Date.now()}`
            );
            return { nombre: f.nombre, url };
          })
        );
      }

      const data: any = {
        dominio,
        tipoMantenimiento,
        clasificacionEquipo: clasificacionSeleccionada,
        activoId: selectedActivo!.id,
        activoClase: selectedActivo!.clase || ACTIVO_CLASE[dominio] || '',
        activoResumen: {
          nombre: selectedActivo!.nombre,
          identificador: selectedActivo!.identificador,
          estado: selectedActivo!.estado,
          ubicacion: selectedActivo!.ubicacion,
        },
        fecha,
        checklist: { items: uploadedChecklist },
        fotosAdicionales: uploadedFotos,
        observacionesGenerales,
        proximoMantenimiento,
        firmaTecnicoUrl: firmaUrl!,
      };
      // Etapa 7+8 — propagacion de retroactividad
      // Se envia esRetroactivo si:
      //  - Vino con retroactivo=1 (entrada desde dashboard/timeline)
      //  - O la fecha ingresada implica retraso > 7 dias
      if (ctxRetroactivo || esFechaRetroactiva) {
        data.esRetroactivo = true;
        data.motivoRetroactivo = motivoRetroactivo.trim();
        if (ctxPeriodoIndice) {
          const idx = parseInt(ctxPeriodoIndice, 10);
          if (Number.isFinite(idx)) data.periodoIndice = idx;
        }
      }

      const resultado = await MantenimientoService.crearRegistro(data);

      await Swal.fire({
        title: 'Mantenimiento registrado',
        text: 'El registro ha sido enviado a validacion exitosamente.',
        icon: 'success',
        confirmButtonColor: '#422AFB',
      });

      router.push(`/admin/mantenimiento/${resultado.id}`);
    } catch (error: any) {
      console.error('Error creando registro:', error);
      Swal.fire('Error', error.message || 'Error al crear el registro de mantenimiento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- Handle signature pad ---

  const handleFirmaSave = async (blob: Blob) => {
    try {
      const fileName = `firma_tecnico_${Date.now()}`;
      const url = await MantenimientoService.subirFirma(blob, fileName);
      setFirmaUrl(url);
      setShowSignaturePad(false);
    } catch (error) {
      console.error('Error subiendo firma:', error);
      Swal.fire('Error', 'Error al guardar la firma.', 'error');
    }
  };

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            Nuevo Mantenimiento
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {ETAPAS[etapa].descripcion}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/mantenimiento')}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
        >
          Volver
        </button>
      </div>

      {/* Etapa 3.3 — Banner contextual cuando viene desde un activo */}
      {(ctxActivoId || ctxRetroactivo) && (
        <div className={`rounded-xl border p-4 ${
          ctxRetroactivo
            ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20'
            : 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
        }`}>
          <p className={`text-sm font-semibold ${
            ctxRetroactivo
              ? 'text-yellow-800 dark:text-yellow-200'
              : 'text-blue-800 dark:text-blue-200'
          }`}>
            {ctxRetroactivo
              ? `Estas registrando un mantenimiento retroactivo${ctxPeriodoIndice ? ` del periodo #${parseInt(ctxPeriodoIndice, 10) + 1}` : ''}`
              : 'Iniciando mantenimiento desde el inventario'}
          </p>
          <p className={`mt-1 text-xs ${
            ctxRetroactivo
              ? 'text-yellow-700 dark:text-yellow-300'
              : 'text-blue-700 dark:text-blue-300'
          }`}>
            Dominio preseleccionado: <strong>{ctxDominio}</strong>
            {ctxFechaSugerida && (
              <> · Fecha sugerida: <strong>{ctxFechaSugerida.split('-').reverse().join('/')}</strong></>
            )}
            {' '}— Busca y selecciona el activo en el paso 1 para continuar.
          </p>
        </div>
      )}

      {/* Step Indicator */}
      <Card extra="p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Etapa {etapa + 1} de {ETAPAS.length}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1 sm:gap-3">
          {ETAPAS.map((et, index) => (
            <div key={et.id} className="flex flex-1 items-center">
              <div className="flex items-center gap-1 sm:gap-2">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 ${
                    index < etapa
                      ? 'bg-green-500 text-white'
                      : index === etapa
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-navy-600 dark:text-gray-400'
                  }`}
                >
                  {index < etapa ? <MdCheck className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`hidden text-xs font-medium lg:block ${
                    index <= etapa
                      ? 'text-navy-700 dark:text-white'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {et.titulo}
                </span>
              </div>
              {index < ETAPAS.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 rounded sm:mx-2 ${
                    index < etapa ? 'bg-green-500' : 'bg-gray-200 dark:bg-navy-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Step Content */}
      <Card extra="p-5 sm:p-6">
        {/* STEP 0: Domain, Asset, Type */}
        {etapa === 0 && (
          <div className="space-y-6">
            <MantenimientoDomainSelector
              selectedDominio={dominio}
              onSelect={handleDominioSelect}
            />

            {dominio && (
              <MantenimientoActivoSearch
                dominio={dominio}
                selectedActivo={selectedActivo}
                onSelect={handleActivoSelect}
              />
            )}

            {selectedActivo && (
              <div className="mt-5">
                <h3 className="mb-3 text-base font-semibold text-navy-700 dark:text-white">
                  Tipo de mantenimiento
                </h3>
                <div className="flex flex-wrap gap-3">
                  {TIPO_MANTENIMIENTO_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTipoSelect(opt.value)}
                      className={`rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                        tipoMantenimiento === opt.value
                          ? opt.value === 'preventivo'
                            ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                            : opt.value === 'correctivo'
                            ? 'bg-red-500 text-white ring-2 ring-red-300'
                            : 'bg-teal-500 text-white ring-2 ring-teal-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-navy-600 dark:text-gray-300 dark:hover:bg-navy-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Clasificacion / Pauta Selection */}
        {etapa === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-navy-700 dark:text-white">
                Pautas de mantenimiento disponibles
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {tipoMantenimiento === 'preventivo' ? 'Preventivo' : tipoMantenimiento === 'correctivo' ? 'Correctivo' : 'Predictivo'}
                {' — '}{dominio === 'equipoMedico' ? 'Equipo Medico' : dominio === 'equipoIndustrial' ? 'Equipo Industrial' : dominio === 'flotaVehicular' ? 'Flota Vehicular' : 'Infraestructura'}
              </span>
            </div>

            {loadingClasificaciones ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                <p className="mt-3 text-sm text-gray-500">Cargando pautas disponibles...</p>
              </div>
            ) : clasificacionesDisponibles.length === 0 ? (
              <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-6 text-center dark:border-yellow-700 dark:bg-yellow-900/20">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  No hay pautas configuradas para {tipoMantenimiento === 'preventivo' ? 'mantenimiento preventivo' : tipoMantenimiento === 'correctivo' ? 'mantenimiento correctivo' : 'mantenimiento predictivo'} en este dominio.
                  Contacte al coordinador para crear las preguntas necesarias.
                </p>
              </div>
            ) : (
              <>
                {(selectedActivo?.pautaAsignada || selectedActivo?.clasificacion) && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                    {selectedActivo?.pautaAsignada ? (
                      <>Pauta predefinida: <strong>{selectedActivo.pautaAsignada}</strong> — puede usar esta o seleccionar otra</>
                    ) : (
                      <>Activo: <strong>{selectedActivo?.clasificacion}</strong> — seleccione la pauta mas adecuada</>
                    )}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {clasificacionesDisponibles.map((clas) => {
                    const isSelected = clasificacionSeleccionada === clas.clasificacion;
                    return (
                      <button
                        key={clas.clasificacion}
                        type="button"
                        onClick={() => handleClasificacionSelect(clas.clasificacion)}
                        className={`flex flex-col rounded-xl border-2 p-4 text-left transition-all ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-300 dark:border-brand-400 dark:bg-brand-900/20'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-navy-600 dark:bg-navy-700 dark:hover:border-navy-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={`text-sm font-bold ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-navy-700 dark:text-white'}`}>
                            {clas.clasificacion}
                          </span>
                          {isSelected && (
                            <MdCheck className="h-5 w-5 flex-shrink-0 text-brand-500" />
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <MdChecklist className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {clas.cantidadPreguntas} {clas.cantidadPreguntas === 1 ? 'pregunta' : 'preguntas'}
                          </span>
                        </div>
                        {clas.categorias.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {clas.categorias.map((cat) => (
                              <span
                                key={cat}
                                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-navy-600 dark:text-gray-300"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 2: Checklist */}
        {etapa === 2 && (
          <div>
            {loadingPreguntas ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                <p className="mt-3 text-sm text-gray-500">Cargando checklist...</p>
              </div>
            ) : (
              <MantenimientoChecklist
                checklist={checklist}
                onChange={setChecklist}
                errors={checklistErrors}
              />
            )}
          </div>
        )}

        {/* STEP 3: Additional Photos */}
        {etapa === 3 && (
          <MantenimientoFotosAdicionales
            dominio={dominio}
            fotos={fotosAdicionales}
            onChange={setFotosAdicionales}
          />
        )}

        {/* STEP 4: Observations & Signature */}
        {etapa === 4 && (
          <div className="space-y-6">
            {/* Etapa 8 — Fecha de ejecucion del mantenimiento (editable) */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700 dark:text-white">
                Fecha de ejecucion del mantenimiento *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                min={fechaBaseActivo || undefined}
                max={hoyStr}
                className="h-10 w-full max-w-xs rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-brand-500 dark:border-navy-600 dark:bg-navy-700 dark:text-white"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Indique la fecha real en que se ejecuto el mantenimiento. No se permiten fechas futuras
                {fechaBaseActivo ? ` ni anteriores a ${fechaBaseActivo} (fecha base del activo)` : ''}.
              </p>
            </div>

            {/* Etapa 8 — Banner amarillo si la fecha implica retraso > 7 dias */}
            {esFechaRetroactiva && (
              <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                  Mantenimiento retroactivo (registrado con {diasDeRetraso} dias de retraso)
                </p>
                <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                  Esta fecha {ctxRetroactivo ? `cubre el periodo${ctxPeriodoIndice ? ` #${parseInt(ctxPeriodoIndice, 10) + 1}` : ''}` : 'es anterior al umbral de 7 dias'}. Indique a continuacion el motivo del registro tardio.
                </p>
              </div>
            )}

            {/* Etapa 7+8 — Motivo retroactivo */}
            {(ctxRetroactivo || esFechaRetroactiva) && (
              <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
                <label className="mb-2 block text-sm font-bold text-yellow-800 dark:text-yellow-200">
                  Motivo del registro retroactivo *
                </label>
                <textarea
                  rows={3}
                  value={motivoRetroactivo}
                  onChange={(e) => setMotivoRetroactivo(e.target.value)}
                  placeholder="Ej: el mantenimiento se ejecuto en terreno pero el registro fue postergado por falla de conectividad..."
                  className="w-full rounded-xl border border-yellow-300 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-500 dark:border-yellow-700 dark:bg-navy-800 dark:text-white"
                  required
                />
                <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
                  Este campo es obligatorio cuando se registra un mantenimiento con fecha pasada (mas de 7 dias).
                </p>
              </div>
            )}

            {/* Observaciones generales */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700 dark:text-white">
                Observaciones generales
              </label>
              <textarea
                rows={4}
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                placeholder="Resumen general del mantenimiento realizado, hallazgos relevantes..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              />
            </div>

            {/* Proximo mantenimiento */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700 dark:text-white">
                Fecha sugerida proximo mantenimiento
              </label>
              <input
                type="date"
                value={proximoMantenimiento}
                onChange={(e) => setProximoMantenimiento(e.target.value)}
                min={fecha}
                className="h-10 w-full max-w-xs rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-brand-500 dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              />
            </div>

            {/* Summary info */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-navy-600 dark:bg-navy-700">
              <h4 className="mb-2 text-sm font-bold text-navy-700 dark:text-white">
                Resumen
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span>Fecha:</span>
                <span className="font-medium">{fecha}</span>
                <span>Tecnico:</span>
                <span className="font-medium">{tecnicoNombre}</span>
                <span>Activo:</span>
                <span className="font-medium">{selectedActivo?.nombre || '—'}</span>
                <span>Dominio:</span>
                <span className="font-medium">{dominio}</span>
                <span>Tipo:</span>
                <span className="font-medium">{tipoMantenimiento}</span>
                <span>Pauta:</span>
                <span className="font-medium">{clasificacionSeleccionada || '—'}</span>
                <span>Preguntas respondidas:</span>
                <span className="font-medium">{checklist.length}</span>
              </div>
            </div>

            {/* Firma */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-navy-700 dark:text-white">
                Firma del tecnico <span className="text-red-500">*</span>
              </label>

              {firmaUrl ? (
                <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
                  <img
                    src={firmaUrl}
                    alt="Firma del tecnico"
                    className="mx-auto max-h-32 object-contain"
                  />
                  <div className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                    <MdCheck className="h-4 w-4" />
                    Firma guardada correctamente
                  </div>
                  <div className="mt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setFirmaUrl(null);
                        setShowSignaturePad(true);
                      }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Volver a firmar
                    </button>
                  </div>
                </div>
              ) : showSignaturePad ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 dark:border-navy-500 dark:bg-navy-700">
                  <MantenimientoSignaturePad
                    onSave={handleFirmaSave}
                    onCancel={() => setShowSignaturePad(false)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSignaturePad(true)}
                  className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-4 text-sm font-medium text-gray-500 hover:border-brand-300 hover:text-brand-500 dark:border-navy-500 dark:text-gray-400"
                >
                  Haga clic aqui para firmar
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <div>
          {etapa > 0 && (
            <button
              type="button"
              onClick={handleAnterior}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
            >
              <MdArrowBack className="h-4 w-4" />
              Anterior
            </button>
          )}
        </div>
        <div>
          {etapa < 4 ? (
            <button
              type="button"
              onClick={handleSiguiente}
              disabled={saving || loadingClasificaciones || loadingPreguntas}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {loadingClasificaciones || loadingPreguntas ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Siguiente
                  <MdArrowForward className="h-4 w-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <MdSend className="h-4 w-4" />
              )}
              Enviar a Validacion
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MantenimientoNuevoPage;
