'use client';
import { useEffect, useState, useMemo } from 'react';
import { UserManagementService } from 'services/user-management.service';
import { EstablecimientoService } from 'services/utils/establecimiento.service';
import { IEstablecimiento } from 'types/utils/establecimiento.types';
import { AllowedUser, UserRole } from 'types/user.types';
import UsersTable from 'components/admin/user-management/UsersTable';
import Card from 'components/card';
import AdminGuard from 'components/auth/AdminGuard';
import { FiSearch } from 'react-icons/fi';

const UserManagement = () => {
  return (
    <AdminGuard>
      <UserManagementContent />
    </AdminGuard>
  );
};

const UserManagementContent = () => {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [establecimientos, setEstablecimientos] = useState<IEstablecimiento[]>([]);
  const [serviciosSalud, setServiciosSalud] = useState<{ codigo: number; nombre: string }[]>([]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await UserManagementService.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    EstablecimientoService.getAll()
      .then((data) => {
        setEstablecimientos(data);
        const ssMap = new Map<number, string>();
        data.forEach((e) => {
          if (e.servicioSaludCodigo && e.servicioSaludNombre && !ssMap.has(e.servicioSaludCodigo)) {
            ssMap.set(e.servicioSaludCodigo, e.servicioSaludNombre);
          }
        });
        const ssList = Array.from(ssMap.entries())
          .map(([codigo, nombre]) => ({ codigo, nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        setServiciosSalud(ssList);
      })
      .catch((err) => console.error('Error cargando establecimientos:', err));
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName && u.displayName.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const handleDeleteUser = async (userId: string) => {
    try {
      await UserManagementService.removeUser(userId);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar usuario');
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await UserManagementService.updateUserRole(userId, newRole);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar rol');
    }
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      await UserManagementService.toggleUserStatus(userId, isActive);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  const handleServicioSaludChange = async (userId: string, servicioCodigo: string) => {
    try {
      const ssObj = serviciosSalud.find((s) => String(s.codigo) === servicioCodigo);
      await UserManagementService.updateUserServicioSalud(
        userId,
        servicioCodigo,
        ssObj?.nombre || ''
      );
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar servicio de salud');
    }
  };

  const handleEstablecimientoChange = async (userId: string, establecimientoId: string) => {
    try {
      const estObj = establecimientos.find((e) => e.id === establecimientoId);
      await UserManagementService.updateUserEstablecimiento(
        userId,
        establecimientoId,
        estObj?.nombre || '',
        estObj?.codigo || 0
      );
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar establecimiento');
    }
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="w-full pt-5 lg:pt-10">
        <h4 className="text-xl font-bold text-navy-700 dark:text-white">
          Gestión de Usuarios
        </h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Los usuarios se registran por su cuenta. Aquí puedes asignarles rol, servicio de salud y establecimiento.
        </p>
      </div>

      {/* Buscador */}
      <Card extra="w-full p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-full items-center rounded-xl bg-lightPrimary text-navy-700 dark:bg-navy-900 dark:text-white">
            <p className="pl-3 pr-2">
              <FiSearch className="h-4 w-4 text-gray-400 dark:text-white" />
            </p>
            <input
              type="text"
              placeholder="Buscar usuario por correo o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block h-full w-full rounded-xl bg-lightPrimary text-sm font-medium text-navy-700 outline-none placeholder:!text-gray-400 dark:bg-navy-900 dark:text-white dark:placeholder:!text-white"
            />
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {filteredUsers.length} de {users.length} usuarios
          </span>
        </div>
      </Card>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando usuarios...</div>
      ) : (
        <UsersTable
          tableData={filteredUsers}
          onDelete={handleDeleteUser}
          onRoleChange={handleRoleChange}
          onToggleStatus={handleToggleStatus}
          serviciosSalud={serviciosSalud}
          establecimientos={establecimientos}
          onServicioSaludChange={handleServicioSaludChange}
          onEstablecimientoChange={handleEstablecimientoChange}
        />
      )}
    </div>
  );
};

export default UserManagement;
