import React from 'react';
import './SearchBar.css';

export function SearchBar({ query, onChange }: { query: string; onChange: (q: string) => void }) {
  return (
    <div className="search-bar">
      <svg className="search-icon" viewBox="0 0 20 20" fill="none">
        <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        className="search-input"
        type="search"
        placeholder="Search…"
        value={query}
        onChange={e => onChange(e.target.value)}
      />
      {query && (
        <button className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          ✕
        </button>
      )}
    </div>
  );
}
