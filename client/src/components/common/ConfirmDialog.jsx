/**
 * Reusable confirmation modal.
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null);
 *
 *   <button onClick={() => setConfirm({ title:'Delete?', message:'...', onConfirm: doDelete })}>
 *   <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
 */
export default function ConfirmDialog({ config, onClose }) {
  if (!config) return null;

  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true, onConfirm } = config;

  const handleConfirm = () => { onConfirm(); onClose(); };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 overflow-hidden animate-fade-in">
        {/* Top accent */}
        <div className={`h-1 w-full ${danger ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-amber-400 to-amber-600'}`}/>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
            {danger ? (
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            )}
          </div>

          {/* Text */}
          <h3 className="text-base font-bold text-gray-900 text-center mb-2">{title}</h3>
          {message && <p className="text-sm text-gray-500 text-center leading-relaxed">{message}</p>}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              {cancelLabel}
            </button>
            <button onClick={handleConfirm}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
                danger
                  ? 'bg-red-500 hover:bg-red-600 shadow-sm shadow-red-200'
                  : 'bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-200'
              }`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
