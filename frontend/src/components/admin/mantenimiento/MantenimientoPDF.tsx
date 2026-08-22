'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import {
  RegistroMantenimiento,
  DOMINIO_MANTENIMIENTO_LABELS,
  TIPO_MANTENIMIENTO_LABELS,
  ESTADO_VALIDACION_LABELS,
} from 'types/mantenimiento.types';

// --------------------------------------------------
// Estilos PDF
// --------------------------------------------------
const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 60,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 4,
  },
  date: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  col: {
    width: '25%',
    marginBottom: 6,
  },
  col33: {
    width: '33.3%',
    marginBottom: 6,
  },
  col50: {
    width: '50%',
    marginBottom: 6,
  },
  label: {
    fontSize: 8,
    color: '#4B5563',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  description: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row' as const,
    backgroundColor: '#F3F4F6',
    padding: 4,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    padding: 4,
    alignItems: 'center' as const,
  },
  criticalRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    padding: 4,
    alignItems: 'center' as const,
    backgroundColor: '#FEF2F2',
  },
  signatureContainer: {
    marginTop: 20,
    alignItems: 'center' as const,
  },
  signatureBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    padding: 5,
    backgroundColor: '#FFFFFF',
  },
  signatureImage: {
    width: 150,
    height: 80,
    objectFit: 'contain' as const,
  },
  signatureText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  signatureSubtext: {
    fontSize: 8,
    color: '#6B7280',
  },
  footer: {
    position: 'absolute' as const,
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    textAlign: 'center' as const,
    color: '#9CA3AF',
    fontSize: 7,
  },
  badge: {
    fontSize: 8,
    fontWeight: 'bold',
    padding: '2 6',
    borderRadius: 4,
  },
});

// --------------------------------------------------
// Componente PDF del documento
// --------------------------------------------------
interface PDFProps {
  registro: RegistroMantenimiento;
}

function formatearFecha(fechaStr: string): string {
  if (!fechaStr) return '-';
  try {
    const parts = fechaStr.split('-');
    if (parts.length === 3) {
      const fecha = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
      );
      return fecha.toLocaleDateString('es-CL');
    }
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    return d.toLocaleDateString('es-CL');
  } catch {
    return fechaStr;
  }
}

function getEstadoColor(estado: string): string {
  switch (estado) {
    case 'Bueno':
      return '#059669';
    case 'Regular':
      return '#D97706';
    case 'Malo':
      return '#DC2626';
    default:
      return '#6B7280';
  }
}

export function MantenimientoPDFDocument({ registro }: PDFProps) {
  const items = registro.checklist?.items || [];
  const estadisticas = {
    total: items.length,
    bueno: items.filter((i) => i.estado === 'Bueno').length,
    regular: items.filter((i) => i.estado === 'Regular').length,
    malo: items.filter((i) => i.estado === 'Malo').length,
  };

  const tipoLabel =
    TIPO_MANTENIMIENTO_LABELS[registro.tipoMantenimiento] ||
    registro.tipoMantenimiento;
  const dominioLabel =
    DOMINIO_MANTENIMIENTO_LABELS[registro.dominio] || registro.dominio;
  const estadoValidacionLabel =
    ESTADO_VALIDACION_LABELS[registro.estadoValidacion] ||
    registro.estadoValidacion;

  return (
    <Document
      title={`Informe Mantenimiento ${tipoLabel} - ${registro.activoResumen?.nombre || 'N/A'}`}
    >
      <Page size="LETTER" style={styles.page}>
        {/* 1. Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            INFORME DE MANTENIMIENTO {tipoLabel.toUpperCase()}
          </Text>
          <Text style={styles.subtitle}>
            Sistema de Gestion de Mantenimiento
          </Text>
          <Text style={styles.date}>
            Generado el {new Date().toLocaleDateString('es-CL')}
          </Text>
        </View>

        {/* 2. Informacion del activo */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Informacion del Activo</Text>
          <View style={styles.grid}>
            <View style={styles.col50}>
              <Text style={styles.label}>Nombre</Text>
              <Text style={styles.value}>
                {registro.activoResumen?.nombre || '-'}
              </Text>
            </View>
            <View style={styles.col50}>
              <Text style={styles.label}>Identificador</Text>
              <Text style={styles.value}>
                {registro.activoResumen?.identificador || '-'}
              </Text>
            </View>
            <View style={styles.col33}>
              <Text style={styles.label}>Estado</Text>
              <Text style={styles.value}>
                {registro.activoResumen?.estado || '-'}
              </Text>
            </View>
            <View style={styles.col33}>
              <Text style={styles.label}>Ubicacion</Text>
              <Text style={styles.value}>
                {registro.activoResumen?.ubicacion || '-'}
              </Text>
            </View>
            <View style={styles.col33}>
              <Text style={styles.label}>Dominio</Text>
              <Text style={styles.value}>{dominioLabel}</Text>
            </View>
          </View>
        </View>

        {/* 3. Informacion del mantenimiento */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>
            Informacion del Mantenimiento
          </Text>
          <View style={styles.grid}>
            <View style={styles.col}>
              <Text style={styles.label}>Fecha</Text>
              <Text style={styles.value}>
                {formatearFecha(registro.fecha)}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Tecnico</Text>
              <Text style={styles.value}>
                {registro.tecnicoNombre || '-'}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Tipo</Text>
              <Text style={styles.value}>{tipoLabel}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Clasificacion</Text>
              <Text style={styles.value}>
                {registro.clasificacionEquipo || '-'}
              </Text>
            </View>
          </View>
          {registro.proximoMantenimiento && (
            <View
              style={{
                marginTop: 8,
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
                paddingTop: 6,
              }}
            >
              <Text style={styles.label}>Proximo Mantenimiento</Text>
              <Text style={styles.value}>
                {formatearFecha(registro.proximoMantenimiento)}
              </Text>
            </View>
          )}
        </View>

        {/* 5. Estadisticas */}
        <View
          style={[styles.section, { backgroundColor: '#F0F9FF' }]}
          wrap={false}
        >
          <Text style={styles.sectionTitle}>Resumen del Checklist</Text>
          <View style={styles.grid}>
            <View style={[styles.col, { textAlign: 'center' as const }]}>
              <Text style={styles.value}>{estadisticas.total}</Text>
              <Text style={styles.label}>Total</Text>
            </View>
            <View style={[styles.col, { textAlign: 'center' as const }]}>
              <Text style={[styles.value, { color: '#059669' }]}>
                {estadisticas.bueno}
              </Text>
              <Text style={styles.label}>Buenos</Text>
            </View>
            <View style={[styles.col, { textAlign: 'center' as const }]}>
              <Text style={[styles.value, { color: '#D97706' }]}>
                {estadisticas.regular}
              </Text>
              <Text style={styles.label}>Regulares</Text>
            </View>
            <View style={[styles.col, { textAlign: 'center' as const }]}>
              <Text style={[styles.value, { color: '#DC2626' }]}>
                {estadisticas.malo}
              </Text>
              <Text style={styles.label}>Malos</Text>
            </View>
          </View>
        </View>

        {/* 4. Checklist tabla */}
        <View>
          <Text style={styles.sectionTitle}>Checklist Detallado</Text>
          <View style={styles.tableHeader}>
            <Text style={{ width: '40%', fontSize: 8, fontWeight: 'bold' }}>
              Pregunta
            </Text>
            <Text style={{ width: '10%', fontSize: 8, fontWeight: 'bold' }}>
              Estado
            </Text>
            <Text style={{ width: '35%', fontSize: 8, fontWeight: 'bold' }}>
              Observaciones
            </Text>
            <Text style={{ width: '15%', fontSize: 8, fontWeight: 'bold' }}>
              Foto
            </Text>
          </View>
          {items.map((it, idx) => (
            <View
              key={it.preguntaId || idx}
              style={it.esCritica ? styles.criticalRow : styles.tableRow}
              wrap={false}
            >
              <Text style={{ width: '40%', fontSize: 8 }}>
                {it.esCritica ? '(!) ' : ''}
                {it.pregunta}
              </Text>
              <View style={{ width: '10%' }}>
                <Text
                  style={{
                    fontSize: 7,
                    fontWeight: 'bold',
                    color: getEstadoColor(it.estado),
                  }}
                >
                  {it.estado}
                </Text>
              </View>
              <Text style={{ width: '35%', fontSize: 7, color: '#6B7280' }}>
                {it.observaciones || '-'}
              </Text>
              <View style={{ width: '15%' }}>
                {it.fotoUrl ? (
                  <Image
                    src={{ uri: it.fotoUrl, cache: 'reload' }}
                    style={{ width: 50, height: 50, objectFit: 'cover' as const, borderRadius: 2 }}
                  />
                ) : (
                  <Text style={{ fontSize: 7, color: '#9CA3AF' }}>-</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* 5b. Fotos del checklist (ampliadas) */}
        {items.some((it) => it.fotoUrl) && (
          <View style={[styles.section, { marginTop: 15 }]}>
            <Text style={styles.sectionTitle}>Evidencia Fotografica del Checklist</Text>
            <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 }}>
              {items.filter((it) => it.fotoUrl).map((it, idx) => (
                <View key={idx} style={{ width: '30%', marginBottom: 10 }} wrap={false}>
                  <Image
                    src={{ uri: it.fotoUrl!, cache: 'reload' }}
                    style={{ width: '100%', height: 120, objectFit: 'cover' as const, borderRadius: 4 }}
                  />
                  <Text style={{ fontSize: 7, color: '#6B7280', marginTop: 2 }}>
                    {it.pregunta}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 5c. Fotos adicionales */}
        {registro.fotosAdicionales && Object.keys(registro.fotosAdicionales).length > 0 && (
          <View style={[styles.section, { marginTop: 15 }]}>
            <Text style={styles.sectionTitle}>Fotos Adicionales</Text>
            {Object.entries(registro.fotosAdicionales).map(([cat, fotos]) => {
              if (!Array.isArray(fotos) || fotos.length === 0) return null;
              return (
                <View key={cat} style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#374151', marginBottom: 4 }}>
                    {cat}
                  </Text>
                  <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 }}>
                    {fotos.map((foto, idx) => {
                      const url = typeof foto === 'string' ? foto : foto?.url;
                      if (!url) return null;
                      return (
                        <View key={idx} style={{ width: '30%' }} wrap={false}>
                          <Image
                            src={{ uri: url, cache: 'reload' }}
                            style={{ width: '100%', height: 100, objectFit: 'cover' as const, borderRadius: 4 }}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 6. Observaciones generales */}
        {registro.observacionesGenerales && (
          <View style={[styles.section, { marginTop: 15 }]} wrap={false}>
            <Text style={styles.sectionTitle}>Observaciones Generales</Text>
            <Text style={styles.description}>
              {registro.observacionesGenerales}
            </Text>
          </View>
        )}

        {/* 7. Firmas */}
        <View wrap={false} style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Firmas</Text>
          <View
            style={{
              flexDirection: 'row' as const,
              justifyContent: 'space-around' as const,
            }}
          >
            {/* Firma tecnico */}
            <View style={{ alignItems: 'center' as const }}>
              {registro.firmaTecnico && (
                <View style={styles.signatureBox}>
                  <Image
                    src={{ uri: registro.firmaTecnico, cache: 'reload' }}
                    style={styles.signatureImage}
                  />
                </View>
              )}
              <Text style={styles.signatureText}>
                {registro.tecnicoNombre}
              </Text>
              <Text style={styles.signatureSubtext}>Tecnico</Text>
            </View>

            {/* Firma validador */}
            {registro.firmaValidador && (
              <View style={{ alignItems: 'center' as const }}>
                <View style={styles.signatureBox}>
                  <Image
                    src={{ uri: registro.firmaValidador, cache: 'reload' }}
                    style={styles.signatureImage}
                  />
                </View>
                <Text style={styles.signatureText}>
                  {registro.validadorNombre || 'Validador'}
                </Text>
                <Text style={styles.signatureSubtext}>Validador</Text>
              </View>
            )}
          </View>
        </View>

        {/* 8. Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Este informe fue generado automaticamente por el Sistema de Gestion
            de Mantenimiento
          </Text>
          <Text>
            Estado: {estadoValidacionLabel}
            {registro.fechaValidacion
              ? ` | Fecha validacion: ${formatearFecha(registro.fechaValidacion)}`
              : ''}{' '}
            | ID: {registro.id}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

// --------------------------------------------------
// Boton de descarga PDF (debe ser dinamico para SSR)
// --------------------------------------------------
const PDFDownloadLinkDynamic = dynamic(
  () =>
    import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink) as any,
  { ssr: false, loading: () => <span className="text-sm text-gray-400">Preparando PDF...</span> },
);

interface MantenimientoPDFButtonProps {
  registro: RegistroMantenimiento;
}

export default function MantenimientoPDFButton({
  registro,
}: MantenimientoPDFButtonProps) {
  const tipoLabel =
    TIPO_MANTENIMIENTO_LABELS[registro.tipoMantenimiento] ||
    registro.tipoMantenimiento;
  const fileName = `Mantenimiento_${tipoLabel}_${registro.activoResumen?.nombre?.replace(/\s+/g, '_') || 'N-A'}_${registro.fecha || 'sin-fecha'}.pdf`;

  return (
    <PDFDownloadLinkDynamic
      document={<MantenimientoPDFDocument registro={registro} />}
      fileName={fileName}
      className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
    >
      {({ loading }: { loading: boolean }) =>
        loading ? 'Generando PDF...' : 'Descargar PDF'
      }
    </PDFDownloadLinkDynamic>
  );
}
