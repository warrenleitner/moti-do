import { render, screen } from '../test/utils';
import { vi } from 'vitest';
import HabitsPage from './HabitsPage';
import { viewsApi } from '../services/api';

vi.mock('../services/api');

describe('HabitsPage', () => {
  beforeEach(() => {
    vi.mocked(viewsApi.getHabits).mockResolvedValue([]);
  });

  it('renders without crashing', () => {
    render(<HabitsPage />);
    const habitsElements = screen.getAllByText(/Habits/i);
    expect(habitsElements.length).toBeGreaterThan(0);
  });

  it('shows create habit button', () => {
    render(<HabitsPage />);
    expect(screen.getByRole('button', { name: /new habit/i })).toBeInTheDocument();
  });

  it('displays empty state', async () => {
    render(<HabitsPage />);
    // Wait for loading to complete
    expect(await screen.findByText(/No habits/i)).toBeInTheDocument();
  });
});
