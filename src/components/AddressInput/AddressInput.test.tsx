import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AddressInput } from './AddressInput';

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890';

describe('AddressInput', () => {
  it('renders input and Search button', () => {
    render(<AddressInput onSubmit={() => {}} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('submit button is disabled when input is empty', () => {
    render(<AddressInput onSubmit={() => {}} />);
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
  });

  it('submit button enables when input has non-whitespace content', () => {
    render(<AddressInput onSubmit={() => {}} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: VALID_ADDRESS },
    });
    expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled();
  });

  it('calls onSubmit with checksummed valid address', () => {
    const onSubmit = vi.fn();
    render(<AddressInput onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: VALID_ADDRESS },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(VALID_ADDRESS);
  });

  it('shows "Invalid Ethereum address" for non-address input', () => {
    render(<AddressInput onSubmit={() => {}} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'not-an-address' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(screen.getByText('Invalid Ethereum address')).toBeInTheDocument();
  });

  it('shows "Enter a wallet address" when value is whitespace-only', () => {
    render(<AddressInput onSubmit={() => {}} />);
    const form = document.querySelector('form')!;
    // Bypass disabled button by submitting form directly
    fireEvent.submit(form);
    expect(screen.getByText('Enter a wallet address')).toBeInTheDocument();
  });

  it('does not call onSubmit when address is invalid', () => {
    const onSubmit = vi.fn();
    render(<AddressInput onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '0xinvalid' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears error message when user starts typing', () => {
    render(<AddressInput onSubmit={() => {}} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(screen.getByText('Invalid Ethereum address')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'b' } });
    expect(
      screen.queryByText('Invalid Ethereum address'),
    ).not.toBeInTheDocument();
  });

  it('disables both input and button when disabled prop is true', () => {
    render(<AddressInput onSubmit={() => {}} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
  });

  it('error is accessible via aria-describedby', () => {
    render(<AddressInput onSubmit={() => {}} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'address-error');
  });
});
