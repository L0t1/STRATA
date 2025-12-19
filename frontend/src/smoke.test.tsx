import { render, screen } from '@testing-library/react';
import App from './App';
import '@testing-library/jest-dom';


test('renders IWMS dashboard', () => {
  render(<App />);
  expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
});
