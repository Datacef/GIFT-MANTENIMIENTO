import Card from 'components/card';
import { useState } from 'react';
import { AuthService } from 'services/auth.service';
import Swal from 'sweetalert2';
import { MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Todos los campos son obligatorios.', confirmButtonColor: '#422AFB' });
      return;
    }
    if (newPassword.length < 8) {
      Swal.fire({ icon: 'warning', title: 'Contraseña muy corta', text: 'La nueva contraseña debe tener al menos 8 caracteres.', confirmButtonColor: '#422AFB' });
      return;
    }
    if (newPassword !== confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'No coinciden', text: 'La nueva contraseña y su confirmación no coinciden.', confirmButtonColor: '#422AFB' });
      return;
    }
    if (currentPassword === newPassword) {
      Swal.fire({ icon: 'warning', title: 'Sin cambios', text: 'La nueva contraseña debe ser diferente a la actual.', confirmButtonColor: '#422AFB' });
      return;
    }

    setLoading(true);
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      Swal.fire({ icon: 'success', title: 'Contraseña actualizada', text: 'Tu contraseña ha sido cambiada exitosamente.', confirmButtonColor: '#422AFB', timer: 3000 });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const msg = error.message?.includes('Invalid username/password')
        ? 'La contraseña actual es incorrecta.'
        : error.message || 'Error al cambiar la contraseña.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#422AFB' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card extra={'w-full h-full p-6'}>
      <div className="mb-6 flex items-center gap-2">
        <MdLock className="h-5 w-5 text-brand-500" />
        <h4 className="text-xl font-bold text-navy-700 dark:text-white">
          Cambiar Contraseña
        </h4>
      </div>

      <div className="flex flex-col gap-4">
        {/* Contraseña actual */}
        <div>
          <label className="mb-1 block text-sm font-medium text-navy-700 dark:text-white">
            Contraseña Actual
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Ingresa tu contraseña actual"
              autoComplete="new-password"
              className="flex h-12 w-full items-center rounded-xl border bg-white/0 p-3 pr-10 text-sm outline-none border-gray-200 dark:!border-white/10 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showCurrent ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Nueva contraseña */}
        <div>
          <label className="mb-1 block text-sm font-medium text-navy-700 dark:text-white">
            Nueva Contraseña
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 caracteres"
              autoComplete="new-password"
              className="flex h-12 w-full items-center rounded-xl border bg-white/0 p-3 pr-10 text-sm outline-none border-gray-200 dark:!border-white/10 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showNew ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
            </button>
          </div>
          {newPassword && newPassword.length < 8 && (
            <p className="mt-1 text-xs text-red-500">Debe tener al menos 8 caracteres</p>
          )}
        </div>

        {/* Confirmar nueva contraseña */}
        <div>
          <label className="mb-1 block text-sm font-medium text-navy-700 dark:text-white">
            Confirmar Nueva Contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
              className="flex h-12 w-full items-center rounded-xl border bg-white/0 p-3 pr-10 text-sm outline-none border-gray-200 dark:!border-white/10 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-2 linear w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 dark:bg-brand-400 dark:hover:bg-brand-300"
        >
          {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
        </button>
      </div>
    </Card>
  );
};

export default ChangePassword;
