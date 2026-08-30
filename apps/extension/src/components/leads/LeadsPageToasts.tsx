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
      {toast && (
        <div className="fixed bottom-4 left-4 right-[calc(var(--ls-rail-width)+1rem)] z-50 flex justify-center animate-toast-in">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 text-sm">
            <span>{toast.name} movido a la papelera</span>
            <button onClick={() => onUndoDelete(toast.id)} className="text-blue-400 hover:text-blue-300 font-medium underline">
              Deshacer
            </button>
            <button onClick={onDismissToast} className="text-ink-muted hover:text-ink-muted ml-1">
              &times;
            </button>
          </div>
        </div>
      )}

      {pinToast && (
        <div className="fixed bottom-36 left-4 right-[calc(var(--ls-rail-width)+1rem)] z-50 flex justify-center animate-toast-in">
          <div className="bg-slate-800 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm flex items-center gap-3">
            <span>{pinToast.isPinned ? `${pinToast.name} ha sido fijado al inicio` : `${pinToast.name} ha sido desfijado`}</span>
          </div>
        </div>
      )}

      {newLeadToast && (
        <div className="fixed bottom-20 left-4 right-[calc(var(--ls-rail-width)+1rem)] z-50 flex justify-center animate-toast-in">
          <div className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow-lg flex items-center gap-3">
            <span>Nuevo lead: {newLeadToast.name}</span>
            <button onClick={onViewNewLead} className="font-medium underline text-white/90 hover:text-white">
              Ver
            </button>
            <button onClick={onDismissNewLeadToast} className="ml-1 text-white/80 hover:text-white">
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
