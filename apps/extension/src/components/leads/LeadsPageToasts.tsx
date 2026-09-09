interface Props {
  toast: { id: string; name: string } | null;
  onUndoDelete: (id: string) => void;
  onDismissToast: () => void;

  pinToast: { name: string; isPinned: boolean } | null;

  newLeadToast: { id: string; name: string } | null;
  onViewNewLead: () => void;
  onDismissNewLeadToast: () => void;
}

export default function LeadsPageToasts({
  toast,
  onUndoDelete,
  onDismissToast,
  pinToast,
  newLeadToast,
  onViewNewLead,
  onDismissNewLeadToast,
}: Props) {
  return (
    <>
      {/*
        `role="status"` en el contenedor de cada aviso, para que se ANUNCIE.

        Borrar un lead, fijarlo o recibir uno nuevo no producia ninguna señal
        para quien usa lector de pantalla: ni de que habia pasado, ni de que
        existia un "Deshacer" disponible por unos segundos.

        Va uno por aviso y no uno envolviendo los tres: con un solo contenedor,
        aparecer uno haria releer los otros.
      */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-4 left-4 right-[calc(var(--ls-rail-width)+1rem)] z-50 flex justify-center animate-toast-in">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 text-sm">
            <span>{toast.name} movido a la papelera</span>
            <button onClick={() => onUndoDelete(toast.id)} className="text-blue-400 hover:text-blue-300 font-medium underline">
              Deshacer
            </button>
            <button
              type="button"
              onClick={onDismissToast}
              aria-label="Cerrar aviso"
              title="Cerrar aviso"
              className="ml-1 flex h-6 w-6 items-center justify-center rounded text-white/70 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-focus"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {pinToast && (
        <div role="status" aria-live="polite" className="fixed bottom-36 left-4 right-[calc(var(--ls-rail-width)+1rem)] z-50 flex justify-center animate-toast-in">
          <div className="bg-slate-800 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm flex items-center gap-3">
            <span>{pinToast.isPinned ? `${pinToast.name} ha sido fijado al inicio` : `${pinToast.name} ha sido desfijado`}</span>
          </div>
        </div>
      )}

      {newLeadToast && (
        <div role="status" aria-live="polite" className="fixed bottom-20 left-4 right-[calc(var(--ls-rail-width)+1rem)] z-50 flex justify-center animate-toast-in">
          <div className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow-lg flex items-center gap-3">
            <span>Nuevo lead: {newLeadToast.name}</span>
            <button onClick={onViewNewLead} className="font-medium underline text-white/90 hover:text-white">
              Ver
            </button>
            <button
              type="button"
              onClick={onDismissNewLeadToast}
              aria-label="Cerrar aviso"
              title="Cerrar aviso"
              className="ml-1 flex h-6 w-6 items-center justify-center rounded text-white/80 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-focus"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
