const banner = '';
import Card from 'components/card';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import Parse from 'utils/parseClient';
import { AuthService } from 'services/auth.service';
import { UserService } from 'services/user.service';
import Swal from 'sweetalert2';
import { MdEdit, MdPhotoCamera } from 'react-icons/md';

const Banner = () => {
  const [displayName, setDisplayName] = useState('');
  const [profession, setProfession] = useState('Cargo no definido');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUser = async () => {
    const user = Parse.User.current();
    if (!user) return;
    const profile = AuthService.mapUser(user);
    setDisplayName(profile.displayName);
    setPhotoURL(profile.photoURL);
    try {
      const profileData = await UserService.getUserProfile(user.id);
      if (profileData?.profession) setProfession(profileData.profession);
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  };

  useEffect(() => {
    loadUser();
    const handleUpdate = () => loadUser();
    window.addEventListener('user-profile-updated', handleUpdate);
    return () => window.removeEventListener('user-profile-updated', handleUpdate);
  }, []);

  const handleEditName = async () => {
    const { value: newName } = await Swal.fire({
      title: 'Actualizar Nombre',
      input: 'text',
      inputLabel: 'Ingresa tu nombre completo',
      inputValue: displayName,
      showCancelButton: true,
      confirmButtonColor: '#422AFB',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => { if (!value) return '¡Necesitas escribir algo!'; }
    });

    if (newName) {
      try {
        await AuthService.updateProfile({ displayName: newName });
        setDisplayName(newName);
        window.dispatchEvent(new Event('user-profile-updated'));
        Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Tu nombre ha sido actualizado.', confirmButtonColor: '#422AFB', timer: 2000 });
      } catch {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el nombre.', confirmButtonColor: '#422AFB' });
      }
    }
  };

  const handleEditProfession = async () => {
    const user = Parse.User.current();
    if (!user) return;

    const { value: newProfession } = await Swal.fire({
      title: 'Actualizar Cargo / Profesión',
      input: 'text',
      inputLabel: 'Ingresa tu cargo actual',
      inputValue: profession,
      showCancelButton: true,
      confirmButtonColor: '#422AFB',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar'
    });

    if (newProfession) {
      try {
        await UserService.updateUserProfile(user.id, { profession: newProfession });
        setProfession(newProfession);
        Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Tu cargo ha sido actualizado.', confirmButtonColor: '#422AFB', timer: 2000 });
      } catch {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el cargo.', confirmButtonColor: '#422AFB' });
      }
    }
  };

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const user = Parse.User.current();
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({ icon: 'warning', title: 'Archivo muy grande', text: 'La imagen debe ser menor a 2MB.', confirmButtonColor: '#422AFB' });
      return;
    }

    try {
      Swal.fire({ title: 'Subiendo imagen...', text: 'Por favor espera', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const downloadURL = await UserService.uploadProfilePhoto(user.id, file);
      await AuthService.updateProfile({ photoURL: downloadURL });
      setPhotoURL(downloadURL);
      window.dispatchEvent(new Event('user-profile-updated'));
      Swal.fire({ icon: 'success', title: 'Foto actualizada', timer: 2000, showConfirmButton: false });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo subir la imagen.', confirmButtonColor: '#422AFB' });
    }
  };

  return (
    <Card extra={'items-center w-full h-full p-[16px] bg-cover'}>
      <div
        className="relative mt-1 flex h-48 w-full justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600"
      >
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1 bg-white/80 dark:bg-navy-800/80 rounded-full text-xs font-bold text-navy-700 dark:text-white uppercase tracking-wider backdrop-blur-sm shadow-sm">
            Gestión de Mantenimiento
          </span>
        </div>

        <div
          className="absolute -bottom-16 flex h-[120px] w-[120px] items-center justify-center rounded-full border-[5px] border-white bg-pink-400 dark:!border-navy-700 relative group cursor-pointer shadow-xl"
          onClick={handlePhotoClick}
          title="Cambiar foto de perfil"
        >
          <div className="relative h-full w-full rounded-full overflow-hidden">
            {photoURL ? (
              <Image src={photoURL} alt="Profile" className="h-full w-full object-cover" width={120} height={120} unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-brand-500 text-white text-4xl font-bold">
                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <MdPhotoCamera className="text-white text-3xl" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full border-2 border-white dark:border-navy-700 shadow-md">
            <MdPhotoCamera className="text-sm" />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>
      </div>

      <div className="mt-20 flex flex-col items-center">
        <div className="flex items-center gap-2 group cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors" onClick={handleEditName}>
          <h4 className="text-3xl font-bold text-navy-700 dark:text-white text-center tracking-tight">{displayName}</h4>
          <MdEdit className="text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
        </div>
        <div className="flex items-center gap-2 mt-1 group cursor-pointer p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors" onClick={handleEditProfession}>
          <p className="text-base font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">{profession}</p>
          <MdEdit className="text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
        </div>
      </div>
    </Card>
  );
};

export default Banner;
