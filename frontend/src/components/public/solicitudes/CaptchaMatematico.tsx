'use client';
import { useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';

interface Props {
  onChange: (val: { respuesta: number; esperado: number; valido: boolean }) => void;
}

// Captcha simple: muestra "a + b = ?" o "a - b = ?" con numeros pequenos.
// El frontend compara visualmente y el backend re-verifica (defensa en profundidad).
export default function CaptchaMatematico({ onChange }: Props) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [op, setOp] = useState<'+' | '-'>('+');
  const [respuesta, setRespuesta] = useState('');

  const generar = () => {
    const na = Math.floor(Math.random() * 9) + 1;
    const nb = Math.floor(Math.random() * 9) + 1;
    const operador: '+' | '-' = Math.random() > 0.5 ? '+' : '-';
    // Para restas: asegurar que a >= b
    if (operador === '-' && na < nb) {
      setA(nb);
      setB(na);
    } else {
      setA(na);
      setB(nb);
    }
    setOp(operador);
    setRespuesta('');
  };

  useEffect(() => {
    generar();
  }, []);

  const esperado = op === '+' ? a + b : a - b;

  useEffect(() => {
    const r = parseInt(respuesta, 10);
    onChange({
      respuesta: isNaN(r) ? NaN : r,
      esperado,
      valido: !isNaN(r) && r === esperado,
    });
  }, [respuesta, esperado, onChange]);

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          Verificacion: {a} {op} {b} =
        </label>
        <input
          type="number"
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          placeholder="Resultado"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={generar}
        title="Generar nuevo desafio"
        className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
      >
        <MdRefresh className="h-5 w-5" />
      </button>
    </div>
  );
}
