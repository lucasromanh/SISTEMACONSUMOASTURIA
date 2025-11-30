import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

export function DatePicker({ date, onDateChange, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onDateChange(selectedDate);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-10 px-3 py-2 border-2 hover:bg-accent hover:border-primary/50 transition-colors',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          <span className="truncate">
            {date ? (
              format(date, "d 'de' MMMM 'de' yyyy", { locale: es })
            ) : (
              'Selecciona una fecha'
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-card border-2" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          locale={es}
          className="rounded-md border-0"
        />
        <div className="flex items-center justify-between border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onDateChange(new Date());
              setOpen(false);
            }}
            className="h-8 text-xs"
          >
            Hoy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-8 text-xs"
          >
            Cerrar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
