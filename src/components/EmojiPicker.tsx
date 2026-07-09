import { useState } from 'react';

const EMOJIS: Record<string, string[]> = {
  'Caritas': ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😗','😋','😛','😜','🤪','😎','🤩','🥳','😏','😒','😞','😔','😢','😭','😤','😡','🤬','😱','😨','😰','😴','🤒','🤕','🤗','🤔','🫡','🤝'],
  'Gestos': ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👋','🤚','✋','👏','🙌','💪','🦾','🙏','🤲','💅','🤳','🙋','🙆','🙅','🤷','🤦','🙇'],
  'Corazones': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕','💖','💗','💘','💝','💟','♥️','💌'],
  'Fuego/Estrellas': ['🔥','⭐','🌟','✨','💫','🎉','🎊','🎈','💯','✅','❌','⚠️','🚀','💡','💰','💎','🏆','🥇','🎯','📌','📎','🔔','🔕','💬','📢','📣'],
  'Negocios': ['💼','📊','📈','📉','💹','📋','📝','✍️','💻','📱','📞','☎️','📧','📨','📩','📬','🏢','🏭','🤝','📅','⏰','⌚','📌','🔗','💡'],
  'Manos/Flechas': ['👉','👈','☝️','👇','🖕','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','🔄','🔃','⤵️','⤴️','🔙','🔚','🔜','⏩','⏪','▶️','◀️'],
  'Objetos': ['🎁','🎂','🍕','☕','🍺','🍷','🎵','🎶','📚','✈️','🚗','🏠','🌍','🌈','☀️','🌙','⚡','☁️','🌊','🌸','🌺','🌻','🌹','🍀','🎄'],
};

export default function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const [category, setCategory] = useState(Object.keys(EMOJIS)[0]);

  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 w-72 z-30">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-gray-500">Emojis</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">x</button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 mb-2">
        {Object.keys(EMOJIS).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`text-xs px-2 py-0.5 rounded ${
              category === cat ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
        {(EMOJIS[category] || []).map((emoji, i) => (
          <button
            key={i}
            onClick={() => onSelect(emoji)}
            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-lg leading-none cursor-pointer"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
