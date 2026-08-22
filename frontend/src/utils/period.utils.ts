import { MeasurementPeriod } from 'types/indicator.types';

export const isSameDate = (d1: Date, d2: Date) => {
  return d1.getDate() === d2.getDate() && 
         d1.getMonth() === d2.getMonth() && 
         d1.getFullYear() === d2.getFullYear();
};

export const generateExpectedPeriods = (start: Date, end: Date, frequency: MeasurementPeriod) => {
  const periods: { start: Date, end: Date }[] = [];
  let current = new Date(start);

  while (current <= end) {
    let periodStart = new Date(current);
    let periodEnd = new Date(current);

    switch (frequency) {
      case MeasurementPeriod.WEEKLY:
        // Logic:
        // 1. First period starts at 'current' (e.g. Jan 1st) and ends on the next Sunday.
        // 2. Subsequent periods start on Monday and end on Sunday.
        
        // Find days remaining until Sunday (0)
        // If today is Sunday (0), difference is 0.
        // If today is Mon (1), difference is 6.
        // If today is Thu (4), difference is 3.
        const dayOfWeek = current.getDay();
        const daysToSunday = (7 - dayOfWeek) % 7;
        
        periodEnd.setDate(current.getDate() + daysToSunday);
        periodEnd.setHours(23, 59, 59, 999);
        
        periods.push({ start: new Date(current), end: new Date(periodEnd) });
        
        // Advance to next day (Monday)
        current = new Date(periodEnd);
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        break;
      case MeasurementPeriod.MONTHLY:
        periodStart.setDate(1); // 1st of month
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59); // Last day of month
        periods.push({ start: periodStart, end: periodEnd });
        current.setMonth(current.getMonth() + 1);
        break;
      case MeasurementPeriod.ANNUAL:
        periodStart = new Date(current.getFullYear(), 0, 1);
        periodEnd = new Date(current.getFullYear(), 11, 31, 23, 59, 59);
        periods.push({ start: periodStart, end: periodEnd });
        current.setFullYear(current.getFullYear() + 1);
        break;
      case MeasurementPeriod.QUARTERLY:
        // Quarter logic: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
        // Adjust start to beginning of current quarter if needed (though start usually is Jan 1)
        const currentMonth = current.getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        
        periodStart = new Date(current.getFullYear(), quarterStartMonth, 1);
        periodEnd = new Date(current.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59);
        
        // If our current pointer is already past this quarter, advance
        if (current > periodEnd) {
           current.setDate(1);
           current.setMonth(current.getMonth() + 3); // Safety advance
           continue; 
        }

        periods.push({ start: periodStart, end: periodEnd });
        
        // Advance to next quarter
        current = new Date(periodEnd);
        current.setDate(current.getDate() + 1); // 1st of next month
        break;

      case MeasurementPeriod.SEMESTER:
        // Semester logic: S1 (Jan-Jun), S2 (Jul-Dec)
        const semesterStartMonth = current.getMonth() < 6 ? 0 : 6;
        
        periodStart = new Date(current.getFullYear(), semesterStartMonth, 1);
        periodEnd = new Date(current.getFullYear(), semesterStartMonth + 6, 0, 23, 59, 59);

         // If our current pointer is past this semester
        if (current > periodEnd) {
           current.setDate(1);
           current.setMonth(current.getMonth() + 6);
           continue;
        }
        
        periods.push({ start: periodStart, end: periodEnd });
        
        // Advance to next semester
        current = new Date(periodEnd);
        current.setDate(current.getDate() + 1);
        break;

      default:
         current.setDate(current.getDate() + 1); // Avoid infinite loop
         break;
    }
  }
  return periods;
};
