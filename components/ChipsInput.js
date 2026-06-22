import { useState } from 'react';

export default function ChipsInput({ value = [], onChange, placeholder }) {
  const [text, setText] = useState('');

  const add = (name) => {
    const n = name.trim();
    if (!n) return;
    if (value.some((v) => v.toLowerCase() === n.toLowerCase())) { setText(''); return; }
    onChange([...value, n]);
    setText('');
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      remove(value.length - 1);
    }
  };

  return (
    <div className="chips-input">
      {value.map((p, i) => (
        <span className="chip" key={i}>
          {p}
          <i
            className="ti ti-x chip-rm"
            style={{ fontSize: 13 }}
            onClick={() => remove(i)}
            aria-label={`Quitar ${p}`}
          />
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => add(text)}
        placeholder={value.length ? '' : placeholder}
      />
    </div>
  );
}
