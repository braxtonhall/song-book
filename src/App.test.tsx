import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders loading spinner on mount', () => {
  render(<App />);
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
});
