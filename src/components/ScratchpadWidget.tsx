import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { StickyNote } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ScratchpadWidget() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const isMobile = useIsMobile();
  
  const storageKey = user ? `pmms-scratchpad-${user.id}` : 'pmms-scratchpad-generic';

  // Load content
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setContent(saved);
    }
  }, [storageKey]);

  // Save content
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    localStorage.setItem(storageKey, val);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="p-2 rounded-md hover:bg-muted transition-colors relative group"
          aria-label="Open Scratchpad"
        >
          <StickyNote className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </SheetTrigger>
      <SheetContent side={isMobile ? "bottom" : "right"} className="w-full sm:max-w-md h-[85vh] sm:h-full p-0 flex flex-col glass-sidebar">
        <SheetHeader className="px-5 py-4 border-b shrink-0 flex flex-col justify-center">
          <SheetTitle className="text-base flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-primary" />
            Scratchpad
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 p-4 flex flex-col min-h-0">
          <Textarea
            value={content}
            onChange={handleChange}
            placeholder="Jot down quick notes, component IDs, measurements..."
            className="flex-1 w-full resize-none border-0 focus-visible:ring-0 rounded-none p-2 bg-transparent text-foreground shadow-none"
            style={{ minHeight: '100%' }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
