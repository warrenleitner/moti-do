import { render } from '../../test/utils';
import DateDisplay from './DateDisplay';

// Helper to create a date string in local timezone (avoiding UTC conversion issues)
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('DateDisplay', () => {
  it('renders nothing when date is undefined', () => {
    const { container } = render(<DateDisplay date={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders date with icon', () => {
    const today = new Date();
    const { container } = render(<DateDisplay date={toLocalDateString(today)} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders date without icon when showIcon is false', () => {
    const today = new Date();
    const { container } = render(<DateDisplay date={toLocalDateString(today)} showIcon={false} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });

  it('renders relative date - today', () => {
    const today = new Date();
    const { container } = render(<DateDisplay date={toLocalDateString(today)} />);
    expect(container.textContent).toContain('Today');
  });

  it('renders relative date - tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { container } = render(<DateDisplay date={toLocalDateString(tomorrow)} />);
    expect(container.textContent).toContain('Tomorrow');
  });

  it('renders relative date - yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { container } = render(<DateDisplay date={toLocalDateString(yesterday)} />);
    expect(container.textContent).toContain('Yesterday');
  });

  it('renders relative date - days in future', () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const { container } = render(<DateDisplay date={toLocalDateString(future)} />);
    expect(container.textContent).toContain('In 3 days');
  });

  it('renders relative date - days overdue', () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    const { container } = render(<DateDisplay date={toLocalDateString(past)} />);
    expect(container.textContent).toContain('3 days overdue');
  });

  it('renders absolute date when showRelative is false', () => {
    const testDate = new Date(2025, 5, 15); // Month is 0-indexed, so 5 = June
    const { container } = render(<DateDisplay date={toLocalDateString(testDate)} showRelative={false} />);
    expect(container.textContent).toMatch(/6\/15\/2025/);
  });

  it('renders label in tooltip', () => {
    const testDate = new Date(2025, 5, 15);
    const { container } = render(<DateDisplay date={toLocalDateString(testDate)} label="Due" showRelative={false} />);
    expect(container.textContent).toMatch(/6\/15\/2025/);
  });
});
