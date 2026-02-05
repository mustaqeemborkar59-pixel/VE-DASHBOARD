
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

type NoteColor = Note['color'];

const noteColorClasses: Record<NoteColor, { bg: string, text: string, border: string }> = {
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
  const [color, setColor] = useState<NoteColor>(initialData?.color || 'default');

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
    <form id="note-form" onSubmit={handleSubmit} className="grid gap-6 py-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title (Optional)</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Your note here..." required  className="min-h-[150px]"/>
      </div>
      <div className="grid gap-2">
        <Label>Color</Label>
        <RadioGroup value={color} onValueChange={(value) => setColor(value as NoteColor)} className="flex flex-wrap gap-3">
          {Object.keys(noteColorClasses).map((key) => {
            const colorKey = key as NoteColor;
            return (
              <Label key={colorKey} className={cn('h-8 w-8 rounded-full cursor-pointer border-2 border-transparent', noteColorClasses[colorKey].bg, color === colorKey && 'ring-2 ring-offset-2 ring-ring ring-offset-background')}>
                <RadioGroupItem value={colorKey} className="sr-only"/>
              </Label>
            );
          })}
        </RadioGroup>
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
    if (!firestore) return;

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
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Your personal space for thoughts and reminders.</CardDescription>
              </div>
              <Button onClick={() => openFormDialog(null)} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </div>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-56 animate-pulse"></Card>
            ))}
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {notes.map(note => (
              <Card key={note.id} className={cn("flex flex-col", noteColorClasses[note.color].bg, noteColorClasses[note.color].border)}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  {note.title && <CardTitle className={cn("text-lg", noteColorClasses[note.color].text)}>{note.title}</CardTitle>}
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={cn("h-7 w-7 -mt-2 -mr-2 shrink-0", noteColorClasses[note.color].text)}>
                              <EllipsisVertical className="h-4 w-4" />
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => openFormDialog(note)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openDeleteDialog(note)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className={cn("whitespace-pre-wrap", noteColorClasses[note.color].text)}>{note.content}</p>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground pt-4 pb-2">
                  {format(new Date(note.createdAt), "dd MMM, yyyy")}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-2xl font-semibold">No notes yet</h3>
            <p className="text-muted-foreground mt-2">Click "Add Note" to create your first one.</p>
          </div>
        )}
      </div>

       <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeAllDialogs()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
          </DialogHeader>
          <NoteForm
            onSubmit={handleFormSubmit}
            initialData={selectedNote || undefined}
          />
           <DialogFooter>
              <Button variant="outline" type="button" onClick={closeAllDialogs}>
                Cancel
              </Button>
              <Button type="submit" form="note-form">
                {selectedNote ? 'Save Changes' : 'Add Note'}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && closeAllDialogs()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this note. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
