'use client';
import InputField from 'components/fields/InputField';
import Default from 'components/auth/variants/DefaultAuthLayout';
import { AuthService } from 'services/auth.service';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

function SignUpDefault() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleRegister = async () => {
    try {
      if (!email || !password || !name) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos incompletos',
          text: 'Por favor complete todos los campos',
          confirmButtonColor: '#422AFB'
        });
        return;
      }

      await AuthService.register(
        email,
        password,
        name
      );
      // Redirigir al login o dashboard tras registro exitoso
      await Swal.fire({
        icon: 'success',
        title: 'Registro exitoso',
        text: 'Tu cuenta ha sido creada. Ya puedes iniciar sesión.',
        confirmButtonColor: '#422AFB'
      });
      router.push('/auth/sign-in');
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error de registro',
        text: err.message || 'Error al registrarse',
        confirmButtonColor: '#422AFB'
      });
    }
  };

  return (
    <Default
      maincard={
        <div className="mb-16 mt-16 flex h-full w-full items-center justify-center px-2 md:mx-0 md:px-0 lg:mb-10 lg:items-center lg:justify-start">
          {/* Sign up section */}
          <div className="mt-[10vh] w-full max-w-full flex-col items-center md:pl-4 lg:pl-0 xl:max-w-[420px]">
            <h3 className="mb-2.5 text-4xl font-bold text-navy-700 dark:text-white">
              Registrarse
            </h3>
            <p className="mb-9 ml-1 text-base text-gray-600">
              Ingresa tus datos para registrarte
            </p>

            {/* Name */}
            <InputField
              variant="auth"
              extra="mb-3"
              label="Nombre Completo*"
              placeholder="Juan Pérez"
              id="name"
              type="text"
              value={name}
              onChange={(e: any) => setName(e.target.value)}
            />

            {/* Email */}
            <InputField
              variant="auth"
              extra="mb-3"
              label="Correo Electrónico*"
              placeholder="nombre@ejemplo.com"
              id="email"
              type="text"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
            />

            {/* Password */}
            <InputField
              variant="auth"
              extra="mb-3"
              label="Contraseña*"
              placeholder="Mín. 8 caracteres"
              id="password"
              type="password"
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
            />

            <button 
              onClick={handleRegister}
              className="linear w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200"
            >
              Registrarse
            </button>
            <div className="mt-4">
              <span className="text-sm font-medium text-navy-700 dark:text-gray-500">
                ¿Ya tienes una cuenta?
              </span>
              <a
                href="/auth/sign-in"
                className="ml-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-white"
              >
                Iniciar Sesión
              </a>
            </div>
          </div>
        </div>
      }
    />
  );
}

export default SignUpDefault;
