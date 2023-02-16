import React from 'react';
import { useState } from 'react';

function IndexOptions() {
  const [data, setData] = useState('');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
      }}
    >
      <h2>popup.tsx</h2>
    </div>
  );
}

export default IndexOptions;
