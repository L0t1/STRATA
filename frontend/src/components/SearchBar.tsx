
import React, { useState, useEffect } from 'react';

function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div style={{ marginBottom: 16, position: 'relative' }}>
      <input
        type="text"
        placeholder="Type to search instantly..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="input"
        style={{ paddingRight: '40px' }}
      />
      {query && (
        <button 
          onClick={() => setQuery('')}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: 'var(--color-text-muted)'
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
}

export default SearchBar;
