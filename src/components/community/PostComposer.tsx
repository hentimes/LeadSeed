import { useState } from 'react';
import { Button, Modal } from '../../design';
import { POST_BODY_MAX, POST_TITLE_MAX } from '../../services/communityForumService';
import type { CommunityCategory, NewCommunityPost } from '../../types/community';
import { getErrorMessage } from '../../utils/errorMessage';

interface PostComposerProps {
  categories: CommunityCategory[];
  defaultCategoryId?: string;
  onClose: () => void;
  onPublish: (post: NewCommunityPost) => Promise<void>;
}

export default function PostComposer({
  categories,
  defaultCategoryId,
  onClose,
  onPublish,
}: PostComposerProps) {
  const [categoryId, setCategoryId] = useState(defaultCategoryId || categories[0]?.id || '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await onPublish({ categoryId, title, body });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo publicar.'));
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-ink dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-soft';

  return (
    <Modal onClose={onClose} maxWidth="560px" label="Nueva publicación">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
        <h2 className="text-section-title font-semibold text-ink">Nueva publicación</h2>

        <label className="flex flex-col gap-1">
          <span className="text-micro font-semibold text-ink-muted uppercase tracking-wider">Categoría</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldClass}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-micro font-semibold text-ink-muted uppercase tracking-wider">Título</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={POST_TITLE_MAX}
            placeholder="¿De qué querés hablar?"
            className={fieldClass}
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-micro font-semibold text-ink-muted uppercase tracking-wider">Contenido</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={POST_BODY_MAX}
            rows={7}
            placeholder="Compartí tu experiencia, consulta o consejo..."
            className={`${fieldClass} resize-none`}
          />
          <span className="self-end text-[10px] text-ink-muted">
            {body.length} / {POST_BODY_MAX}
          </span>
        </label>

        {error && <p className="text-sm text-state-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Publicando...' : 'Publicar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
