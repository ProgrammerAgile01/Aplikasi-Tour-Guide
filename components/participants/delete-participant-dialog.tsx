"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface DeleteParticipantDialogProps {
  participantId: string;
  participantName?: string;
  onDeleted?: () => void;
}

export function DeleteParticipantDialog({
  participantId,
  participantName,
  onDeleted,
}: DeleteParticipantDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/participants/${participantId}`, {
          method: "DELETE",
        });
        const data = await res.json();

        if (!res.ok)
          throw new Error(data?.message ?? "Gagal menghapus peserta");

        toast({
          title: "Peserta dihapus",
          description: `Peserta "${participantName ?? ""}" berhasil dihapus.`,
        });

        setOpen(false);
        onDeleted?.();
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Gagal menghapus peserta",
          description: err.message ?? "Terjadi kesalahan.",
        });
      }
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Hapus
      </Button>

      <AnimatePresence>
        {open && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[420px] backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border border-gray-200/20 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  Konfirmasi Hapus
                </DialogTitle>
              </DialogHeader>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-3 text-sm text-gray-700 dark:text-gray-300"
              >
                <p>
                  Apakah Anda yakin ingin menghapus peserta{" "}
                  <span className="font-semibold text-red-600">
                    {participantName ?? "ini"}
                  </span>
                  ?
                </p>
                <p className="mt-1 text-gray-500 text-xs">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </motion.div>

              <DialogFooter className="mt-6 flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:opacity-90"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Hapus
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
