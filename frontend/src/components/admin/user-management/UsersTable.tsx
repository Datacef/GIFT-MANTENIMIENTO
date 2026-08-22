import React from 'react';
import CardMenu from 'components/card/CardMenu';
import Card from 'components/card';
import { MdCancel, MdCheckCircle, MdDelete } from 'react-icons/md';
import { AllowedUser, UserRole, USER_ROLE_LABELS } from '../../../types/user.types';
import { IEstablecimiento } from '../../../types/utils/establecimiento.types';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

const columnHelper = createColumnHelper<AllowedUser>();

export default function UsersTable(props: {
  tableData: AllowedUser[];
  onDelete: (id: string) => void;
  onRoleChange: (id: string, newRole: UserRole) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  serviciosSalud: { codigo: number; nombre: string }[];
  establecimientos: IEstablecimiento[];
  onServicioSaludChange: (id: string, servicioCodigo: string) => void;
  onEstablecimientoChange: (id: string, establecimientoId: string) => void;
}) {
  const {
    tableData, onDelete, onRoleChange, onToggleStatus,
    serviciosSalud, establecimientos,
    onServicioSaludChange, onEstablecimientoChange
  } = props;
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = [
    columnHelper.accessor('email', {
      id: 'email',
      header: () => <p className="text-sm font-bold text-gray-600 dark:text-white">EMAIL</p>,
      cell: (info) => (
        <div>
          <p className="text-sm font-bold text-navy-700 dark:text-white">{info.getValue()}</p>
          {info.row.original.displayName && (
            <p className="text-xs text-gray-500">{info.row.original.displayName}</p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('role', {
      id: 'role',
      header: () => <p className="text-sm font-bold text-gray-600 dark:text-white">ROL</p>,
      cell: (info) => (
        <select
          value={info.getValue()}
          onChange={(e) => onRoleChange(info.row.original.id!, e.target.value as UserRole)}
          className="text-sm font-bold text-navy-700 dark:text-white bg-transparent border border-gray-200 rounded p-1"
        >
          {Object.values(UserRole).map((role) => (
            <option key={role} value={role}>{USER_ROLE_LABELS[role]}</option>
          ))}
        </select>
      ),
    }),
    columnHelper.accessor('servicioSaludNombre', {
      id: 'servicioSalud',
      header: () => <p className="text-sm font-bold text-gray-600 dark:text-white">SERVICIO SALUD</p>,
      cell: (info) => (
        <select
          value={info.row.original.servicioSaludId || ''}
          onChange={(e) => onServicioSaludChange(info.row.original.id!, e.target.value)}
          className="text-xs text-navy-700 dark:text-white bg-transparent border border-gray-200 rounded p-1 max-w-[180px]"
        >
          <option value="">Sin asignar</option>
          {serviciosSalud.map((s) => (
            <option key={s.codigo} value={String(s.codigo)}>{s.nombre}</option>
          ))}
        </select>
      ),
    }),
    columnHelper.accessor('establecimientoNombre', {
      id: 'establecimiento',
      header: () => <p className="text-sm font-bold text-gray-600 dark:text-white">ESTABLECIMIENTO</p>,
      cell: (info) => {
        const user = info.row.original;
        const ssId = user.servicioSaludId;
        const filteredEst = ssId
          ? establecimientos.filter((e) => String(e.servicioSaludCodigo) === ssId).sort((a, b) => a.nombre.localeCompare(b.nombre))
          : [];
        return (
          <select
            value={user.establecimientoId || ''}
            onChange={(e) => onEstablecimientoChange(user.id!, e.target.value)}
            disabled={!ssId}
            className="text-xs text-navy-700 dark:text-white bg-transparent border border-gray-200 rounded p-1 max-w-[220px] disabled:opacity-40"
          >
            <option value="">{ssId ? 'Seleccionar...' : 'Asigne servicio'}</option>
            {filteredEst.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        );
      },
    }),
    columnHelper.accessor('isActive', {
      id: 'status',
      header: () => <p className="text-sm font-bold text-gray-600 dark:text-white">ESTADO</p>,
      cell: (info) => (
        <div className="flex items-center cursor-pointer" onClick={() => onToggleStatus(info.row.original.id!, !info.getValue())}>
          {info.getValue() ? (
            <MdCheckCircle className="me-1 text-green-500 dark:text-green-300 h-5 w-5" />
          ) : (
            <MdCancel className="me-1 text-red-500 dark:text-red-300 h-5 w-5" />
          )}
          <p className="text-sm font-bold text-navy-700 dark:text-white">
            {info.getValue() ? 'Activo' : 'Inactivo'}
          </p>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <p className="text-sm font-bold text-gray-600 dark:text-white">ACCIONES</p>,
      cell: (info) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
                onDelete(info.row.original.id!);
              }
            }}
            className="text-red-500 hover:text-red-700"
          >
            <MdDelete className="h-5 w-5" />
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card extra={'w-full h-full px-6 pb-6 sm:overflow-x-auto'}>
      <div className="relative flex items-center justify-between pt-4">
        <div className="text-xl font-bold text-navy-700 dark:text-white">
          Usuarios del Sistema
        </div>
        <CardMenu />
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="!border-px !border-gray-400">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer border-b border-gray-200 pb-2 pr-4 pt-4 text-start dark:border-white/30"
                  >
                    <div className="items-center justify-between text-xs text-gray-200">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="min-w-[130px] border-white/0 py-3 pr-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
