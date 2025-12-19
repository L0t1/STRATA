
import React, { useState } from 'react';
import AccessibleButton from './AccessibleButton';

function FilterBar({ onFilter }: { onFilter: (status: string) => void }) {
  const [status, setStatus] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    onFilter(e.target.value);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label>
        Filter by Status:{' '}
        <select value={status} onChange={handleChange}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="picked">Picked</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
        </select>
      </label>
    </div>
  );
}

export default FilterBar;
