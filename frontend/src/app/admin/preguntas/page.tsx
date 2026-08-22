'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import PreguntaFormModal from 'components/admin/preguntas/PreguntaFormModal';
import ImportErroresModal, { ImportError } from 'components/admin/preguntas/ImportErroresModal';
import { PreguntaMantenimientoService } from 'services/pregunta-mantenimiento.service';
import {
  PreguntaMantenimiento,
  PreguntaFilters,
  Dominio,
  DOMINIO_LABELS,
  DOMINIO_COLORS,
  TipoMantenimiento,
  TIPO_MANTENIMIENTO_LABELS,
  TIPO_MANTENIMIENTO_COLORS,
  TipoRespuesta,
  TIPO_RESPUESTA_LABELS,
  EstadoGeneral,
} from 'types/pregunta-mantenimiento.types';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdToggleOn,
  MdToggleOff,
  MdSearch,
  MdUpload,
  MdWarning,
  MdMedicalServices,
  MdPrecisionManufacturing,
  MdBusiness,
  MdDirectionsCar,
  MdFilterList,
  MdDescription,
} from 'react-icons/md';
import Swal from 'sweetalert2';

const DOMINIO_ICONS: Record<Dominio, React.ReactNode> = {
  [Dominio.EQUIPO_MEDICO]: <MdMedicalServices className="h-4 w-4" />,
  [Dominio.EQUIPO_INDUSTRIAL]: <MdPrecisionManufacturing className="h-4 w-4" />,
  [Dominio.INFRAESTRUCTURA]: <MdBusiness className="h-4 w-4" />,
  [Dominio.FLOTA_VEHICULAR]: <MdDirectionsCar className="h-4 w-4" />,
};

const DOMINIO_TAB_COLORS: Record<string, { active: string; inactive: string }> = {
  all: {
    active: 'bg-navy-700 text-white dark:bg-white dark:text-navy-700',
    inactive: 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy-700',
  },
  [Dominio.EQUIPO_MEDICO]: {
    active: 'bg-blue-500 text-white',
    inactive: 'text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20',
  },
  [Dominio.EQUIPO_INDUSTRIAL]: {
    active: 'bg-orange-500 text-white',
    inactive: 'text-orange-600 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-900/20',
  },
  [Dominio.INFRAESTRUCTURA]: {
    active: 'bg-green-500 text-white',
    inactive: 'text-green-600 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/20',
  },
  [Dominio.FLOTA_VEHICULAR]: {
    active: 'bg-purple-500 text-white',
    inactive: 'text-purple-600 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-900/20',
  },
};

const PreguntasPage = () => {
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
    if (level >= 3) {
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

  return <PreguntasContent />;
};

const PreguntasContent = () => {
  const [preguntas, setPreguntas] = useState<PreguntaMantenimiento[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dominioFilter, setDominioFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [clasificacionFilter, setClasificacionFilter] = useState<string>('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activoFilter, setActivoFilter] = useState<string>('');

  // Dropdowns data
  const [clasificaciones, setClasificaciones] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPregunta, setEditingPregunta] = useState<PreguntaMantenimiento | null>(null);

  // Import errors modal
  const [importErroresOpen, setImportErroresOpen] = useState(false);
  const [importErrores, setImportErrores] = useState<ImportError[]>([]);
  const [preguntasValidasPendientes, setPreguntasValidasPendientes] = useState<any[]>([]);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const loadFilterOptions = useCallback(async (dom?: string, clas?: string) => {
    try {
      const clasificacionesData = await PreguntaMantenimientoService.getClasificaciones(dom);
      setClasificaciones(clasificacionesData);
      const categoriasData = await PreguntaMantenimientoService.getCategorias(dom, clas);
      setCategorias(categoriasData);
    } catch (error) {
      console.error('Error cargando opciones de filtro:', error);
    }
  }, []);

  const fetchPreguntas = useCallback(async () => {
    setLoading(true);
    try {
      const filters: PreguntaFilters = {
        limit: pageSize,
        skip: page * pageSize,
      };
      if (dominioFilter !== 'all') filters.dominio = dominioFilter as Dominio;
      if (tipoFilter) filters.tipoMantenimiento = tipoFilter as TipoMantenimiento;
      if (clasificacionFilter) filters.clasificacionEquipo = clasificacionFilter;
      if (categoriaFilter) filters.categoria = categoriaFilter;
      if (searchQuery.trim()) filters.busqueda = searchQuery.trim();
      if (activoFilter === 'true') filters.activo = true;
      if (activoFilter === 'false') filters.activo = false;

      const result = await PreguntaMantenimientoService.getPreguntas(filters);
      setPreguntas(result.results);
      setTotal(result.total);
    } catch (error) {
      console.error('Error cargando preguntas:', error);
    } finally {
      setLoading(false);
    }
  }, [dominioFilter, tipoFilter, clasificacionFilter, categoriaFilter, searchQuery, activoFilter, page]);

  // Load clasificaciones when dominio changes
  useEffect(() => {
    const dom = dominioFilter !== 'all' ? dominioFilter : undefined;
    loadFilterOptions(dom);
    setClasificacionFilter('');
    setCategoriaFilter('');
  }, [dominioFilter, loadFilterOptions]);

  // Load categorias when clasificacion changes
  useEffect(() => {
    if (!clasificacionFilter) return;
    const dom = dominioFilter !== 'all' ? dominioFilter : undefined;
    PreguntaMantenimientoService.getCategorias(dom, clasificacionFilter).then(setCategorias);
    setCategoriaFilter('');
  }, [clasificacionFilter, dominioFilter]);

  useEffect(() => {
    fetchPreguntas();
  }, [fetchPreguntas]);

  // Stats
  const stats = useMemo(() => {
    return {
      total,
      activas: preguntas.filter((p) => p.activo).length,
      inactivas: preguntas.filter((p) => !p.activo).length,
      criticas: preguntas.filter((p) => p.esCritica).length,
    };
  }, [preguntas, total]);

  const handleToggleActivo = async (pregunta: PreguntaMantenimiento) => {
    try {
      await PreguntaMantenimientoService.toggleActivo(pregunta.id);
      fetchPreguntas();
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al cambiar estado', 'error');
    }
  };

  const handleDelete = async (pregunta: PreguntaMantenimiento) => {
    const result = await Swal.fire({
      title: 'Eliminar pregunta',
      text: `Se eliminara la pregunta: "${pregunta.pregunta}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Eliminar',
    });
    if (result.isConfirmed) {
      try {
        await PreguntaMantenimientoService.deletePregunta(pregunta.id, true);
        Swal.fire('Eliminada', 'La pregunta ha sido eliminada.', 'success');
        fetchPreguntas();
      } catch (error: any) {
        Swal.fire('Error', error.message || 'Error al eliminar', 'error');
      }
    }
  };

  const handleEdit = (pregunta: PreguntaMantenimiento) => {
    setEditingPregunta(pregunta);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingPregunta(null);
    setModalOpen(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = [
        'dominio', 'tipoMantenimiento', 'clasificacionEquipo', 'categoria',
        'pregunta', 'descripcion', 'tipoRespuesta', 'opcionesRespuesta',
        'estadoGeneral', 'requiereFoto', 'requiereObservacion', 'esCritica',
        'orden', 'activo', 'referenciaAcreditacion',
      ];
      const exampleRows: any[] = [
        {
          dominio: 'equipoMedico',
          tipoMantenimiento: 'preventivo',
          clasificacionEquipo: 'Ventilador Mecanico',
          categoria: 'Estado General',
          pregunta: '¿El equipo enciende correctamente?',
          descripcion: 'Verificar encendido y autotest inicial',
          tipoRespuesta: 'siNo',
          opcionesRespuesta: '',
          estadoGeneral: 'bueno',
          requiereFoto: 'TRUE',
          requiereObservacion: 'FALSE',
          esCritica: 'TRUE',
          orden: 1,
          activo: 'TRUE',
          referenciaAcreditacion: 'EQ-2.1',
        },
        {
          dominio: 'equipoMedico',
          tipoMantenimiento: 'preventivo',
          clasificacionEquipo: 'Ventilador Mecanico',
          categoria: 'Seguridad',
          pregunta: 'Nivel de ruido del equipo (dB)',
          descripcion: 'Medir con sonometro a 1m de distancia',
          tipoRespuesta: 'escala',
          opcionesRespuesta: '',
          estadoGeneral: 'bueno',
          requiereFoto: 'FALSE',
          requiereObservacion: 'TRUE',
          esCritica: 'FALSE',
          orden: 2,
          activo: 'TRUE',
          referenciaAcreditacion: 'EQ-2.2',
        },
        {
          dominio: 'equipoIndustrial',
          tipoMantenimiento: 'correctivo',
          clasificacionEquipo: 'Caldera',
          categoria: 'Mantencion',
          pregunta: 'Tipo de combustible utilizado',
          descripcion: 'Seleccione el combustible actual de la caldera',
          tipoRespuesta: 'seleccion',
          opcionesRespuesta: 'Gas|Diesel|Petroleo|Biomasa',
          estadoGeneral: 'regular',
          requiereFoto: 'FALSE',
          requiereObservacion: 'FALSE',
          esCritica: 'FALSE',
          orden: 1,
          activo: 'TRUE',
          referenciaAcreditacion: 'INS-3.1',
        },
        {
          dominio: 'infraestructura',
          tipoMantenimiento: 'predictivo',
          clasificacionEquipo: 'Red Electrica',
          categoria: 'Tablero General',
          pregunta: 'Observaciones del estado del tablero',
          descripcion: 'Describa cualquier anomalia observada',
          tipoRespuesta: 'texto',
          opcionesRespuesta: '',
          estadoGeneral: 'bueno',
          requiereFoto: 'TRUE',
          requiereObservacion: 'TRUE',
          esCritica: 'TRUE',
          orden: 1,
          activo: 'TRUE',
          referenciaAcreditacion: 'INS-2.1',
        },
        {
          dominio: 'flotaVehicular',
          tipoMantenimiento: 'preventivo',
          clasificacionEquipo: 'Ambulancia',
          categoria: 'Documentacion',
          pregunta: '¿Permiso de circulacion vigente?',
          descripcion: '',
          tipoRespuesta: 'siNo',
          opcionesRespuesta: '',
          estadoGeneral: 'bueno',
          requiereFoto: 'FALSE',
          requiereObservacion: 'FALSE',
          esCritica: 'TRUE',
          orden: 1,
          activo: 'TRUE',
          referenciaAcreditacion: '',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(exampleRows, { header: headers });

      // Second sheet: reference values
      const referencia = [
        { campo: 'dominio', valoresValidos: 'equipoMedico | equipoIndustrial | infraestructura | flotaVehicular', obligatorio: 'SI' },
        { campo: 'tipoMantenimiento', valoresValidos: 'preventivo | correctivo | predictivo', obligatorio: 'SI' },
        { campo: 'clasificacionEquipo', valoresValidos: 'Texto libre (ej: Ventilador Mecanico, Caldera, Ambulancia)', obligatorio: 'SI' },
        { campo: 'categoria', valoresValidos: 'Texto libre (ej: Estado General, Seguridad, Mantencion)', obligatorio: 'SI' },
        { campo: 'pregunta', valoresValidos: 'Texto de la pregunta', obligatorio: 'SI' },
        { campo: 'descripcion', valoresValidos: 'Texto de ayuda (opcional)', obligatorio: 'NO' },
        { campo: 'tipoRespuesta', valoresValidos: 'siNo | escala | texto | seleccion', obligatorio: 'NO (default: siNo)' },
        { campo: 'opcionesRespuesta', valoresValidos: 'Separar con | (pipe). Solo si tipoRespuesta=seleccion', obligatorio: 'Si tipoRespuesta=seleccion' },
        { campo: 'estadoGeneral', valoresValidos: 'bueno | regular | malo | baja', obligatorio: 'NO' },
        { campo: 'requiereFoto', valoresValidos: 'TRUE | FALSE', obligatorio: 'NO (default: FALSE)' },
        { campo: 'requiereObservacion', valoresValidos: 'TRUE | FALSE', obligatorio: 'NO (default: FALSE)' },
        { campo: 'esCritica', valoresValidos: 'TRUE | FALSE', obligatorio: 'NO (default: FALSE)' },
        { campo: 'orden', valoresValidos: 'Numero entero (0,1,2,...)', obligatorio: 'NO (default: 0)' },
        { campo: 'activo', valoresValidos: 'TRUE | FALSE', obligatorio: 'NO (default: TRUE)' },
        { campo: 'referenciaAcreditacion', valoresValidos: 'Codigo libre (ej: EQ-2.1, INS-3.1)', obligatorio: 'NO' },
      ];
      const wsRef = XLSX.utils.json_to_sheet(referencia);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Preguntas');
      XLSX.utils.book_append_sheet(wb, wsRef, 'Referencia');
      XLSX.writeFile(wb, 'formato_preguntas_mantenimiento.xlsx');
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al descargar formato', 'error');
    }
  };

  const parseBool = (v: any, defaultVal = false): boolean => {
    if (v === undefined || v === null || v === '') return defaultVal;
    if (typeof v === 'boolean') return v;
    const s = String(v).trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'si' || s === 'sí' || s === 'yes' || s === 'x';
  };

  const validarPreguntas = (rows: any[]): { validas: any[]; errores: ImportError[] } => {
    const dominiosValidos = Object.values(Dominio) as string[];
    const tiposValidos = Object.values(TipoMantenimiento) as string[];
    const respuestasValidas = Object.values(TipoRespuesta) as string[];
    const estadosValidos = Object.values(EstadoGeneral) as string[];

    const validas: any[] = [];
    const errores: ImportError[] = [];

    rows.forEach((row, idx) => {
      const fila = idx + 2; // +2 porque fila 1 es encabezado y base 0->1
      const errs: string[] = [];
      const dominio = String(row.dominio || '').trim();
      const tipoMantenimiento = String(row.tipoMantenimiento || '').trim();
      const clasificacionEquipo = String(row.clasificacionEquipo || '').trim();
      const categoria = String(row.categoria || '').trim();
      const pregunta = String(row.pregunta || '').trim();
      const tipoRespuesta = String(row.tipoRespuesta || 'siNo').trim();
      const estadoGeneral = String(row.estadoGeneral || 'bueno').trim();

      if (!dominio) errs.push('Falta "dominio"');
      else if (!dominiosValidos.includes(dominio))
        errs.push(`"dominio" invalido ("${dominio}"). Validos: ${dominiosValidos.join(', ')}`);

      if (!tipoMantenimiento) errs.push('Falta "tipoMantenimiento"');
      else if (!tiposValidos.includes(tipoMantenimiento))
        errs.push(`"tipoMantenimiento" invalido ("${tipoMantenimiento}"). Validos: ${tiposValidos.join(', ')}`);

      if (!clasificacionEquipo) errs.push('Falta "clasificacionEquipo"');
      if (!categoria) errs.push('Falta "categoria"');
      if (!pregunta) errs.push('Falta "pregunta"');

      if (tipoRespuesta && !respuestasValidas.includes(tipoRespuesta))
        errs.push(`"tipoRespuesta" invalido ("${tipoRespuesta}"). Validos: ${respuestasValidas.join(', ')}`);

      if (estadoGeneral && !estadosValidos.includes(estadoGeneral))
        errs.push(`"estadoGeneral" invalido ("${estadoGeneral}"). Validos: ${estadosValidos.join(', ')}`);

      let opcionesRespuesta: string[] = [];
      if (Array.isArray(row.opcionesRespuesta)) {
        opcionesRespuesta = row.opcionesRespuesta.map((x: any) => String(x).trim()).filter(Boolean);
      } else if (row.opcionesRespuesta) {
        opcionesRespuesta = String(row.opcionesRespuesta)
          .split('|')
          .map((x: string) => x.trim())
          .filter(Boolean);
      }
      if (tipoRespuesta === 'seleccion' && opcionesRespuesta.length === 0) {
        errs.push('tipoRespuesta=seleccion requiere "opcionesRespuesta" (separadas por |)');
      }

      const ordenNum = row.orden === undefined || row.orden === '' ? 0 : Number(row.orden);
      if (isNaN(ordenNum)) errs.push(`"orden" debe ser numerico (recibido: "${row.orden}")`);

      if (errs.length > 0) {
        errores.push({ fila, pregunta: pregunta || undefined, errores: errs });
      } else {
        validas.push({
          dominio,
          tipoMantenimiento,
          clasificacionEquipo,
          categoria,
          pregunta,
          descripcion: row.descripcion ? String(row.descripcion).trim() : undefined,
          tipoRespuesta,
          opcionesRespuesta: opcionesRespuesta.length > 0 ? opcionesRespuesta : undefined,
          estadoGeneral,
          requiereFoto: parseBool(row.requiereFoto, false),
          requiereObservacion: parseBool(row.requiereObservacion, false),
          esCritica: parseBool(row.esCritica, false),
          orden: ordenNum,
          activo: parseBool(row.activo, true),
          referenciaAcreditacion: row.referenciaAcreditacion
            ? String(row.referenciaAcreditacion).trim()
            : undefined,
        });
      }
    });

    return { validas, errores };
  };

  const ejecutarImportacion = async (items: any[]) => {
    try {
      const result = await PreguntaMantenimientoService.importarPreguntas(items);
      Swal.fire(
        'Importacion completada',
        `Creadas: ${result.created}, Errores backend: ${result.errors}`,
        result.errors > 0 ? 'warning' : 'success'
      );
      fetchPreguntas();
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al importar', 'error');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        let rows: any[] = [];
        const nombre = file.name.toLowerCase();
        if (nombre.endsWith('.json')) {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!Array.isArray(data)) {
            Swal.fire('Error', 'El archivo JSON debe contener un arreglo de preguntas.', 'error');
            return;
          }
          rows = data;
        } else {
          const XLSX = await import('xlsx');
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          const sheetName =
            wb.SheetNames.find((s) => s.toLowerCase() === 'preguntas') || wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        }

        if (rows.length === 0) {
          Swal.fire('Error', 'El archivo no contiene filas de datos.', 'error');
          return;
        }

        const { validas, errores } = validarPreguntas(rows);

        if (errores.length > 0) {
          setImportErrores(errores);
          setPreguntasValidasPendientes(validas);
          setImportErroresOpen(true);
          return;
        }

        const confirm = await Swal.fire({
          title: 'Confirmar importacion',
          text: `Se importaran ${validas.length} preguntas. Desea continuar?`,
          icon: 'question',
          showCancelButton: true,
          cancelButtonText: 'Cancelar',
          confirmButtonText: 'Importar',
        });
        if (!confirm.isConfirmed) return;

        await ejecutarImportacion(validas);
      } catch (error: any) {
        Swal.fire('Error', error.message || 'Error al importar', 'error');
      }
    };
    input.click();
  };

  const handleContinuarConValidos = async () => {
    const items = preguntasValidasPendientes;
    setImportErroresOpen(false);
    setImportErrores([]);
    setPreguntasValidasPendientes([]);
    if (items.length > 0) {
      await ejecutarImportacion(items);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            Preguntas de Mantenimiento
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Gestione las preguntas del checklist de mantenimiento por dominio, tipo y clasificacion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
            title="Descargar plantilla Excel con ejemplos"
          >
            <MdDescription className="h-4 w-4" />
            Descargar Formato
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
            title="Importar preguntas desde Excel o JSON"
          >
            <MdUpload className="h-4 w-4" />
            Importar
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <MdAdd className="h-5 w-5" />
            Nueva Pregunta
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-navy-700 dark:text-white">{stats.total}</p>
        </Card>
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Activas</p>
          <p className="text-2xl font-bold text-green-500">{stats.activas}</p>
        </Card>
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactivas</p>
          <p className="text-2xl font-bold text-gray-400">{stats.inactivas}</p>
        </Card>
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Criticas</p>
          <p className="text-2xl font-bold text-red-500">{stats.criticas}</p>
        </Card>
      </div>

      {/* Domain Tabs */}
      <Card extra="p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDominioFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              dominioFilter === 'all'
                ? DOMINIO_TAB_COLORS.all.active
                : DOMINIO_TAB_COLORS.all.inactive
            }`}
          >
            Todos
          </button>
          {Object.values(Dominio).map((d) => (
            <button
              key={d}
              onClick={() => setDominioFilter(d)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                dominioFilter === d
                  ? DOMINIO_TAB_COLORS[d].active
                  : DOMINIO_TAB_COLORS[d].inactive
              }`}
            >
              {DOMINIO_ICONS[d]}
              {DOMINIO_LABELS[d]}
            </button>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <Card extra="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MdFilterList className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Filtros</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Tipo mantenimiento */}
          <select
            value={tipoFilter}
            onChange={(e) => { setTipoFilter(e.target.value); setPage(0); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todos los tipos</option>
            {Object.values(TipoMantenimiento).map((t) => (
              <option key={t} value={t}>{TIPO_MANTENIMIENTO_LABELS[t]}</option>
            ))}
          </select>

          {/* Clasificacion equipo */}
          <select
            value={clasificacionFilter}
            onChange={(e) => { setClasificacionFilter(e.target.value); setPage(0); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todas las clasificaciones</option>
            {clasificaciones.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Categoria */}
          <select
            value={categoriaFilter}
            onChange={(e) => { setCategoriaFilter(e.target.value); setPage(0); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todas las categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Estado */}
          <select
            value={activoFilter}
            onChange={(e) => { setActivoFilter(e.target.value); setPage(0); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>

          {/* Search */}
          <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-700">
            <MdSearch className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Buscar pregunta..."
              className="ml-2 h-full w-full bg-transparent text-sm outline-none dark:text-white"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card extra="w-full overflow-x-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : preguntas.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            No se encontraron preguntas con los filtros seleccionados.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-600">
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Pregunta
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Dominio
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">
                  Tipo Mant.
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 lg:table-cell">
                  Clasificacion
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 lg:table-cell">
                  Categoria
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 xl:table-cell">
                  Respuesta
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Estado
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {preguntas.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/50"
                >
                  {/* Pregunta */}
                  <td className="max-w-xs px-3 py-3">
                    <div className="flex items-start gap-2">
                      {p.esCritica && (
                        <MdWarning className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" title="Pregunta critica" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-navy-700 dark:text-white line-clamp-2">
                          {p.pregunta}
                        </p>
                        {p.referenciaAcreditacion && (
                          <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-navy-600 dark:text-gray-400">
                            {p.referenciaAcreditacion}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Dominio badge */}
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        DOMINIO_COLORS[p.dominio] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {DOMINIO_ICONS[p.dominio]}
                      <span className="hidden sm:inline">{DOMINIO_LABELS[p.dominio]}</span>
                    </span>
                  </td>

                  {/* Tipo mantenimiento badge */}
                  <td className="hidden px-3 py-3 md:table-cell">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        TIPO_MANTENIMIENTO_COLORS[p.tipoMantenimiento] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {TIPO_MANTENIMIENTO_LABELS[p.tipoMantenimiento]}
                    </span>
                  </td>

                  {/* Clasificacion */}
                  <td className="hidden px-3 py-3 lg:table-cell">
                    <span className="text-sm text-navy-700 dark:text-gray-300">
                      {p.clasificacionEquipo}
                    </span>
                  </td>

                  {/* Categoria */}
                  <td className="hidden px-3 py-3 lg:table-cell">
                    <span className="text-sm text-navy-700 dark:text-gray-300">
                      {p.categoria}
                    </span>
                  </td>

                  {/* Tipo respuesta */}
                  <td className="hidden px-3 py-3 xl:table-cell">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {TIPO_RESPUESTA_LABELS[p.tipoRespuesta]}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => handleToggleActivo(p)}
                      className="inline-flex items-center"
                      title={p.activo ? 'Activa - click para desactivar' : 'Inactiva - click para activar'}
                    >
                      {p.activo ? (
                        <MdToggleOn className="h-7 w-7 text-green-500" />
                      ) : (
                        <MdToggleOff className="h-7 w-7 text-gray-400" />
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(p)}
                        className="rounded-lg p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                        title="Editar"
                      >
                        <MdEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Eliminar"
                      >
                        <MdDelete className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-navy-600">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} de {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
              >
                Anterior
              </button>
              <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-300">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal */}
      <PreguntaFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPregunta(null);
        }}
        onSave={fetchPreguntas}
        pregunta={editingPregunta}
      />

      {/* Import Errors Modal */}
      <ImportErroresModal
        isOpen={importErroresOpen}
        onClose={() => {
          setImportErroresOpen(false);
          setImportErrores([]);
          setPreguntasValidasPendientes([]);
        }}
        errores={importErrores}
        validos={preguntasValidasPendientes.length}
        onContinuarConValidos={
          preguntasValidasPendientes.length > 0 ? handleContinuarConValidos : undefined
        }
      />
    </div>
  );
};

export default PreguntasPage;
