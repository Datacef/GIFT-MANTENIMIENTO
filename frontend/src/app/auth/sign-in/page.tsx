'use client';
import InputField from 'components/fields/InputField';
import Default from 'components/auth/variants/DefaultAuthLayout';
import Checkbox from 'components/checkbox';
import { AuthService } from 'services/auth.service';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

function SignInDefault() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos incompletos',
          text: 'Por favor ingrese correo y contraseña',
          confirmButtonColor: '#422AFB'
        });
        return;
      }
      await AuthService.login(email, password);

      // Redirigir al dashboard tras login exitoso
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
      })
      
      Toast.fire({
        icon: 'success',
        title: 'Inicio de sesión exitoso'
      })
      
      router.push('/admin/default');
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error de inicio de sesión',
        text: 'Credenciales inválidas o error en el servidor',
        confirmButtonColor: '#422AFB'
      });
    }
  };

  const handleForgotPassword = async () => {
    try {
      if (!email) {
        Swal.fire({
          icon: 'warning',
          title: 'Correo requerido',
          text: 'Por favor ingresa tu correo electrónico para restablecer la contraseña.',
          confirmButtonColor: '#422AFB'
        });
        return;
      }
      await AuthService.resetPassword(email);
      Swal.fire({
        icon: 'success',
        title: 'Correo enviado',
        text: 'Se ha enviado un enlace de recuperación a tu correo.',
        confirmButtonColor: '#422AFB'
      });
      setShowForgotPassword(false);
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al enviar el correo de recuperación. Verifica que el correo sea correcto.',
        confirmButtonColor: '#422AFB'
      });
    }
  };

  return (
    <Default
      maincard={
        <div className="mb-16 mt-16 flex h-full w-full items-center justify-center px-2 md:mx-0 md:px-0 lg:mb-10 lg:items-center lg:justify-start">
          {/* Sign in section */}
          <div className="mt-[10vh] w-full max-w-full flex-col items-center md:pl-4 lg:pl-0 xl:max-w-[420px]">
            <h3 className="mb-2.5 text-4xl font-bold text-navy-700 dark:text-white">
              {showForgotPassword ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
            </h3>
            <p className="mb-9 ml-1 text-base text-gray-600">
              {showForgotPassword 
                ? 'Ingresa tu correo para restablecer tu contraseña.' 
                : '¡Ingresa tu correo y contraseña para iniciar sesión!'}
            </p>
            {/* Email */}
            <InputField
              variant="auth"
              extra="mb-3"
              label="Correo Electrónico o Usuario*"
              placeholder="nombre@ejemplo.com"
              id="email"
              type="text"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
            />

            {/* Password - Only show if not in forgot password mode */}
            {!showForgotPassword && (
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
            )}

            {/* Checkbox and Forgot Password Link */}
            {!showForgotPassword && (
              <div className="mb-4 flex items-center justify-between px-2">
                <div className="mt-2 flex items-center">
                  <Checkbox />
                  <p className="ml-2 text-sm font-medium text-navy-700 dark:text-white">
                    Mantener sesión iniciada
                  </p>
                </div>
                <button
                  className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-white"
                  onClick={() => setShowForgotPassword(true)}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
            
            {showForgotPassword ? (
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleForgotPassword}
                  className="linear w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200"
                >
                  Enviar enlace de recuperación
                </button>
                <button 
                  onClick={() => {
                    setShowForgotPassword(false);
                  }}
                  className="text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="linear w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200"
              >
                Iniciar Sesión
              </button>
            )}
            <div className="mt-4">
              <span className="text-sm font-medium text-navy-700 dark:text-gray-500">
                ¿Aún no tienes cuenta?
              </span>
              <a
                href="/auth/sign-up/default"
                className="ml-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-white"
              >
                Crear una cuenta
              </a>
            </div>
          </div>
        </div>
      }
    />
  );
}

export default SignInDefault;
