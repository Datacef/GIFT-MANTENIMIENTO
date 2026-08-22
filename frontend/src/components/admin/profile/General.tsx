import Card from 'components/card';
import { useState, useEffect } from 'react';
import Parse from 'utils/parseClient';
import { UserService, UserProfileData } from 'services/user.service';
import Swal from 'sweetalert2';
import { MdEdit, MdPhone, MdEmail, MdSmartphone, MdWork, MdSchool, MdLocalHospital } from 'react-icons/md';

const General = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<UserProfileData>({
    department: 'No definido',
    division: 'No definido',
    organization: 'Ministerio de Salud',
    education: 'No definido',
    languages: 'Español',
    birthday: 'No definido',
    functions: 'No definido',
    institutionalPhone: 'No definido',
    mobilePhone: 'No definido',
    institutionalEmail: 'No definido'
  });

  useEffect(() => {
    const user = Parse.User.current();
    if (user) {
      setUserId(user.id);
      UserService.getUserProfile(user.id)
        .then(data => { if (data) setProfileData(prev => ({ ...prev, ...data })); })
        .catch(err => console.error('Error cargando datos generales:', err));
    }
  }, []);

  const handleEditField = async (field: keyof UserProfileData, label: string) => {
    if (!userId) return;

    const inputType = field === 'functions' ? 'textarea' : 'text';
    const { value: newValue } = await Swal.fire({
      title: `Actualizar ${label}`,
      input: inputType,
      inputLabel: `Ingresa ${label}`,
      inputValue: profileData[field] || '',
      showCancelButton: true,
      confirmButtonColor: '#422AFB',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar'
    });

    if (newValue !== undefined && newValue !== null) {
      try {
        await UserService.updateUserProfile(userId, { [field]: newValue });
        setProfileData(prev => ({ ...prev, [field]: newValue }));
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true });
        Toast.fire({ icon: 'success', title: 'Actualizado correctamente' });
      } catch {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar la información.', confirmButtonColor: '#422AFB' });
      }
    }
  };

  return (
    <Card extra={'w-full h-full p-3'}>
      <div className="mt-2 mb-8 w-full">
        <h4 className="px-2 text-xl font-bold text-navy-700 dark:text-white flex items-center gap-2">
          Información Institucional <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-navy-700 px-2 py-1 rounded-full">MMTTO</span>
        </h4>
        <p className="mt-2 px-2 text-base text-gray-600">
          Detalles de la asignación actual dentro del sistema de Gestión de Mantenimiento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2 mb-8">
        {/* Servicio de Salud — solo lectura */}
        <div className="flex flex-col items-start justify-center rounded-2xl bg-white bg-clip-border px-4 py-4 shadow-shadow-500 dark:!bg-navy-700 dark:shadow-none border-l-4 border-teal-500 relative">
          <div className="flex items-center gap-2 mb-1">
            <MdLocalHospital className="text-teal-500" />
            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Servicio de Salud</p>
          </div>
          <p className="text-lg font-semibold text-navy-700 dark:text-white mt-1">
            {profileData.servicioSaludNombre || 'No asignado'}
          </p>
          <p className="text-xs text-gray-400 mt-1 italic">
            Solo un administrador puede cambiar este campo.
          </p>
        </div>

        <div className="flex flex-col items-start justify-center rounded-2xl bg-white bg-clip-border px-4 py-4 shadow-shadow-500 dark:!bg-navy-700 dark:shadow-none border-l-4 border-blue-500 relative group hover:shadow-lg transition-all">
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-full" onClick={() => handleEditField('organization', 'Organización')}>
            <MdEdit className="text-blue-500" />
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Organización</p>
          <p className="text-lg font-semibold text-navy-700 dark:text-white mt-1">{profileData.organization}</p>
        </div>

        <div className="flex flex-col items-start justify-center rounded-2xl bg-white bg-clip-border px-4 py-4 shadow-shadow-500 dark:!bg-navy-700 dark:shadow-none border-l-4 border-green-500 relative group hover:shadow-lg transition-all">
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-full" onClick={() => handleEditField('department', 'Departamento')}>
            <MdEdit className="text-green-500" />
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Departamento / Dirección</p>
          <p className="text-lg font-semibold text-navy-700 dark:text-white mt-1">{profileData.department}</p>
        </div>

        <div className="flex flex-col items-start justify-center rounded-2xl bg-white bg-clip-border px-4 py-4 shadow-shadow-500 dark:!bg-navy-700 dark:shadow-none border-l-4 border-purple-500 relative group hover:shadow-lg transition-all">
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-full" onClick={() => handleEditField('division', 'División')}>
            <MdEdit className="text-purple-500" />
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">División / Unidad</p>
          <p className="text-lg font-semibold text-navy-700 dark:text-white mt-1">{profileData.division}</p>
        </div>
      </div>

      <div className="mt-6 mb-4 w-full border-t pt-6 border-gray-200 dark:border-navy-600">
        <h4 className="px-2 text-lg font-bold text-navy-700 dark:text-white flex items-center gap-2">
          Información de Contacto y Funciones
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
        <div className="col-span-1 md:col-span-2 flex flex-col justify-center rounded-2xl bg-white bg-clip-border px-4 py-4 shadow-shadow-500 dark:!bg-navy-700 dark:shadow-none group relative border-l-4 border-orange-500">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-full" onClick={() => handleEditField('functions', 'Funciones Principales')}>
            <MdEdit className="text-orange-500" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <MdWork className="text-orange-500" />
            <p className="text-sm text-gray-600 font-bold">Funciones Principales</p>
          </div>
          <p className="text-base font-medium text-navy-700 dark:text-white whitespace-pre-wrap">
            {profileData.functions || 'Describa sus funciones principales...'}
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-2xl bg-white bg-clip-border px-4 py-4 shadow-shadow-500 dark:!bg-navy-700 dark:shadow-none group relative">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-full" onClick={() => handleEditField('education', 'Título Profesional')}>
            <MdEdit className="text-gray-500" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <MdSchool className="text-gray-400" />
            <p className="text-sm text-gray-600">Título Profesional</p>
          </div>
          <p className="text-base font-medium text-navy-700 dark:text-white">{profileData.education}</p>
        </div>

        <div className="flex flex-col justify-center rounded-2xl bg-white bg-clip-border px-4 py-4 shadow-shadow-500 dark:!bg-navy-700 dark:shadow-none group relative">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-full" onClick={() => handleEditField('institutionalEmail', 'Correo Institucional')}>
            <MdEdit className="text-gray-500" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <MdEmail className="text-gray-400" />
            <p className="text-sm text-gray-600">Correo Institucional</p>
          </div>
          <p className="text-base font-medium text-navy-700 dark:text-white">{profileData.institutionalEmail}</p>
        </div>

        <div className="flex flex-col justify-center rounded-2xl bg-white bg-clip-border px-4 py-4 shadow-shadow-500 dark:!bg-navy-700 dark:shadow-none group relative">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-full" onClick={() => handleEditField('institutionalPhone', 'Teléfono Institucional')}>
            <MdEdit className="text-gray-500" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <MdPhone className="text-gray-400" />
            <p className="text-sm text-gray-600">Teléfono Institucional</p>
          </div>
          <p className="text-base font-medium text-navy-700 dark:text-white">{profileData.institutionalPhone}</p>
        </div>

        <div className="flex flex-col justify-center rounded-2xl bg-white bg-clip-border px-4 py-4 shadow-shadow-500 dark:!bg-navy-700 dark:shadow-none group relative">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-full" onClick={() => handleEditField('mobilePhone', 'Móvil')}>
            <MdEdit className="text-gray-500" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <MdSmartphone className="text-gray-400" />
            <p className="text-sm text-gray-600">Móvil</p>
          </div>
          <p className="text-base font-medium text-navy-700 dark:text-white">{profileData.mobilePhone}</p>
        </div>
      </div>
    </Card>
  );
};

export default General;
