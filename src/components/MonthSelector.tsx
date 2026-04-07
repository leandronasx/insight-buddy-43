import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMonth } from '@/contexts/MonthContext';

export function MonthSelector() {
  const { label, goNext, goPrev } = useMonth();

  return (
    <div className="flex items-center gap-3">
      <button onClick={goPrev} className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>
      <span className="font-display text-lg font-semibold text-foreground min-w-[100px] text-center">
        {label}
      </span>
      <button onClick={goNext} className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
        <ChevronRight className="h-5 w-5 text-foreground" />
      </button>
    </div>
  );
}
