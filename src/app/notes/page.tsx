'use client';
import { useState, useMemo, useCallback } from 'react';
import AppLayout from "@/components/app-layout";
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { Note } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type PresetColor = 'default' | 'yellow' | 'blue' | 'green' | 'pink' | 'purple';

const noteColorClasses: Record<PresetColor, { bg: string, text: string, border: string }> = {
  default: { bg: 'bg-card', text: 'text-card-foreground', border: 'border-border' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-900 dark:text-yellow-200', border: 'border-yellow-200 dark:border-yellow-800' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-900 dark:text-blue-200', border: 'border-blue-200 dark:border-blue-800' },
  green: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-900 dark:text-green-200', border: 'border-green-200 dark:border-green-800' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-900 dark:text-pink-200', border: 'border-pink-200 dark:border-pink-800' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-900 dark:text-purple-200', border: 'border-purple-200 dark:border-purple-800' },
};

const NoteForm = ({
  onSubmit,
  initialData,
}: {
  onSubmit: (data: Omit<Note, 'id' | 'createdAt'>) => void;
  initialData?: Partial<Note>;
}) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [color, setColor] = useState<string>(initialData?.color || 'default');

  const isPresetColor = (c: string): c is PresetColor => Object.keys(noteColorClasses).includes(c);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast({
        variant: "destructive",
        title: "Content required",
        description: "Please enter some content for your note.",
      });
      return;
    }
    onSubmit({ title, content, color });
  };

  return (
    <form id="note-form" onSubmit={handleSubmit} className="grid gap-4 py-2">
      <div className="grid gap-1.5">
        <Label htmlFor="title" className="text-xs">Title (Optional)</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" className="h-9 text-sm" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="content" className="text-xs">Content</Label>
        <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Your note here..." required  className="min-h-[120px] text-sm"/>
      </div>
       <div className="grid gap-1.5">
        <Label className="text-xs">Color</Label>
        <div className="flex flex-wrap items-center gap-2">
          <RadioGroup value={isPresetColor(color) ? color : ''} onValueChange={setColor} className="flex flex-wrap gap-2">
            {(Object.keys(noteColorClasses) as PresetColor[]).map((key) => (
              <Label key={key} title={key} className={cn('h-7 w-7 rounded-full cursor-pointer border-2', noteColorClasses[key].bg, color === key ? 'ring-2 ring-offset-2 ring-ring ring-offset-background' : 'border-transparent')}>
                <RadioGroupItem value={key} className="sr-only"/>
              </Label>
            ))}
          </RadioGroup>
          
          <div className="relative h-7 w-7">
             <Label htmlFor="custom-color" className={cn('h-7 w-7 rounded-full cursor-pointer border-2 flex items-center justify-center', !isPresetColor(color) ? 'ring-2 ring-offset-2 ring-ring ring-offset-background' : 'border-transparent', isPresetColor(color) && 'bg-muted')}>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: !isPresetColor(color) ? color : undefined, backgroundImage: isPresetColor(color) ? 'conic-gradient(from 90deg, violet, indigo, blue, green, yellow, orange, red, violet)' : undefined }} />
             </Label>
             <Input 
                id="custom-color"
                type="color"
                value={isPresetColor(color) ? '#000000' : color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             />
          </div>
        </div>
      </div>
    </form>
  );
};

export default function NotesPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const notesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'notes'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: notes, isLoading } = useCollection<Note>(notesQuery);

  const closeAllDialogs = useCallback(() => {
      setIsFormOpen(false);
      setNoteToDelete(null);
      setSelectedNote(null);
  }, []);

  const handleDelayedAction = (action: () => void) => {
    setTimeout(action, 100);
  };

  const openFormDialog = useCallback((note: Note | null) => {
    closeAllDialogs();
    setSelectedNote(note);
    handleDelayedAction(() => setIsFormOpen(true));
  }, [closeAllDialogs]);

  const openDeleteDialog = useCallback((note: Note) => {
    closeAllDialogs();
    handleDelayedAction(() => setNoteToDelete(note));
  }, [closeAllDialogs]);

  const handleFormSubmit = (formData: Omit<Note, 'id' | 'createdAt'>) => {
    if (!firestore || !user) return;

    if (selectedNote) {
      const noteDocRef = doc(firestore, 'notes', selectedNote.id);
      updateDocumentNonBlocking(noteDocRef, formData);
      toast({ title: "Success", description: "Note updated successfully." });
    } else {
      const notesCollection = collection(firestore, 'notes');
      addDocumentNonBlocking(notesCollection, {
        ...formData,
        createdAt: new Date().toISOString(),
      });
      toast({ title: "Success", description: "Note added successfully." });
    }
    closeAllDialogs();
  };

  const handleDelete = () => {
    if (!firestore || !noteToDelete) return;
    
    const noteDocRef = doc(firestore, 'notes', noteToDelete.id);
    deleteDocumentNonBlocking(noteDocRef);

    toast({
      title: "Note Deleted",
      description: `The note has been deleted.`,
    });

    setNoteToDelete(null);
  };
  
  return (
    <AppLayout>
      <div className="flex flex-col gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Notes</CardTitle>
                <CardDescription className="hidden sm:block">Your personal space for thoughts and reminders.</CardDescription>
              </div>
              <Button onClick={() => openFormDialog(null)} size="sm" className="h-8 text-xs">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Add Note
              </Button>
            </div>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-40 sm:h-56 animate-pulse"></Card>
            ))}
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {notes.map(note => {
              const isPresetColor = (c: string): c is PresetColor => Object.keys(noteColorClasses).includes(c);
              
              let cardDynamicStyle: React.CSSProperties = {};
              let textDynamicStyle: React.CSSProperties = {};
              let cardDynamicClass = '';
              let textDynamicClass = '';
              let footerDynamicStyle: React.CSSProperties = {};

              if (isPresetColor(note.color)) {
                  const preset = noteColorClasses[note.color];
                  cardDynamicClass = `${preset.bg} ${preset.border}`;
                  textDynamicClass = preset.text;
              } else {
                  cardDynamicStyle = { backgroundColor: note.color, border: '1px solid transparent' };
                  try {
                      const hex = note.color.replace('#', '');
                      const r = parseInt(hex.substring(0, 2), 16);
                      const g = parseInt(hex.substring(2, 4), 16);
                      const b = parseInt(hex.substring(4, 6), 16);
                      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                      const textColor = yiq >= 128 ? '#18181b' : '#fafafa';
                      textDynamicStyle = { color: textColor };
                      footerDynamicStyle = { color: textColor, opacity: 0.8 };
                  } catch(e) {
                      textDynamicStyle = { color: 'hsl(var(--card-foreground))' };
                  }
              }

              return (
                <Card key={note.id} className={cn("flex flex-col", cardDynamicClass)} style={cardDynamicStyle}>
                  <CardHeader className="flex flex-row items-start justify-between pb-1 pt-3 sm:pt-6">
                    {note.title && <CardTitle className={cn("text-sm sm:text-lg", textDynamicClass)} style={textDynamicStyle}>{note.title}</CardTitle>}
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className={cn("h-7 w-7 -mt-1 -mr-1 shrink-0", textDynamicClass)} style={textDynamicStyle}>
                                <EllipsisVertical className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openFormDialog(note)} className="text-xs">
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openDeleteDialog(note)} className="text-destructive text-xs">
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex-grow pt-1">
                    <p className={cn("whitespace-pre-wrap text-xs sm:text-sm", textDynamicClass)} style={textDynamicStyle}>{note.content}</p>
                  </CardContent>
                  <CardFooter className="text-[10px] pt-2 pb-2" style={footerDynamicStyle}>
                    {format(new Date(note.createdAt), "dd MMM, yyyy")}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-xl sm:text-2xl font-semibold">No notes yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">Click "Add Note" to create your first one.</p>
          </div>
        )}
      </div>

       <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeAllDialogs()}>
        <DialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{selectedNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
          </DialogHeader>
          <NoteForm
            onSubmit={handleFormSubmit}
            initialData={selectedNote || undefined}
          />
           <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button variant="outline" type="button" onClick={closeAllDialogs} className="h-9">
                Cancel
              </Button>
              <Button type="submit" form="note-form" className="h-9">
                {selectedNote ? 'Save Changes' : 'Add Note'}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && closeAllDialogs()}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete this note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 h-9">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
