export interface IEstablecimiento {
  id?: string;
  codigo: number;
  nombre: string;
  regionCodigo?: number;
  regionNombre?: string;
  servicioSaludCodigo?: number;
  servicioSaludNombre?: string;
  tipoEstablecimiento?: string;
  dependenciaAdministrativa?: string;
  comunaCodigo?: number;
  comunaNombre?: string;
  nivelComplejidad?: string;
  tipoAtencion?: string;
  estadoFuncionamiento?: string;
}
