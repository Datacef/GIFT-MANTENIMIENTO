import { MeasurementPeriod } from '../types/indicator.types';

export const getNextDueDate = (period: MeasurementPeriod, fromDate: Date = new Date()): Date => {
  const current = new Date(fromDate);
  const year = current.getFullYear();
  const month = current.getMonth();
  let dueDate = new Date();

  switch (period) {
    case MeasurementPeriod.WEEKLY:
      // Viernes de la semana actual
      // 0=Sun, 1=Mon, ..., 5=Fri
      const day = current.getDay();
      const diff = 5 - day; // Días hasta el viernes
      dueDate.setDate(current.getDate() + diff);
      // Si hoy es Sábado (6), el viernes ya pasó -> next week? 
      // La regla dice "Viernes de cada semana". 
      // Si estamos ejecutando el Sábado, el viernes de *esta* semana ya pasó.
      // Asumiremos que nos interesa el "cierre" de la semana en curso.
      break;

    case MeasurementPeriod.MONTHLY:
      // Último día del mes actual
      dueDate = new Date(year, month + 1, 0);
      break;

    case MeasurementPeriod.QUARTERLY:
      // Último día de Marzo, Junio, Septiembre, Diciembre
      // Q1: 0,1,2 -> End Mar (2)
      // Q2: 3,4,5 -> End Jun (5)
      // Q3: 6,7,8 -> End Sep (8)
      // Q4: 9,10,11 -> End Dec (11)
      const currentQuarter = Math.floor(month / 3);
      const endMonthOfQuarter = (currentQuarter + 1) * 3 - 1;
      dueDate = new Date(year, endMonthOfQuarter + 1, 0);
      break;

    case MeasurementPeriod.SEMESTER:
      // Último día de Junio o Diciembre
      // S1: 0-5 -> End Jun (5)
      // S2: 6-11 -> End Dec (11)
      const isFirstSemester = month < 6;
      const semesterEndMonth = isFirstSemester ? 5 : 11;
      dueDate = new Date(year, semesterEndMonth + 1, 0);
      break;

    case MeasurementPeriod.ANNUAL:
      // Último día de Diciembre
      dueDate = new Date(year, 11, 31);
      break;
  }

  // Set to end of day
  dueDate.setHours(23, 59, 59, 999);
  return dueDate;
};

export const getDaysDifference = (d1: Date, d2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((d1.getTime() - d2.getTime()) / oneDay);
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getDate() === d2.getDate() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getFullYear() === d2.getFullYear();
};
