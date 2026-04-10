import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { TransferForm } from './TransferForm';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
}));

vi.mock('@/hooks/useErc20Transfer', () => ({
  useErc20Transfer: vi.fn(),
}));

import { useAccount, useReadContract } from 'wagmi';
import { useErc20Transfer } from '@/hooks/useErc20Transfer';

const mockUseAccount = vi.mocked(useAccount);
const mockUseReadContract = vi.mocked(useReadContract);
const mockUseErc20Transfer = vi.mocked(useErc20Transfer);

const DEFAULT_TRANSFER_HOOK: ReturnType<typeof useErc20Transfer> = {
  execute: vi.fn(),
  status: 'idle',
  txHash: undefined,
  error: null,
  simulateError: null,
  reset: vi.fn(),
  canExecute: false,
};

function mockConnectedToSepolia() {
  mockUseAccount.mockReturnValue({
    isConnected: true,
    chain: {
      id: 11155111,
      name: 'Ethereum Sepolia',
      blockExplorers: { default: { url: 'https://sepolia.etherscan.io' } },
    },
  } as unknown as ReturnType<typeof useAccount>);

  // decimals del contrato
  mockUseReadContract.mockReturnValue({
    data: 6,
    isLoading: false,
  } as unknown as ReturnType<typeof useReadContract>);
}

describe('TransferForm', () => {
  afterEach(cleanup);

  describe('cuando la wallet no está conectada', () => {
    it('no renderiza nada', () => {
      mockUseAccount.mockReturnValue({
        isConnected: false,
        chain: undefined,
      } as unknown as ReturnType<typeof useAccount>);
      mockUseReadContract.mockReturnValue({
        data: undefined,
      } as unknown as ReturnType<typeof useReadContract>);
      mockUseErc20Transfer.mockReturnValue(DEFAULT_TRANSFER_HOOK);

      const { container } = render(<TransferForm />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('cuando la red no está soportada', () => {
    it('muestra el hint de cambio de red', () => {
      mockUseAccount.mockReturnValue({
        isConnected: true,
        chain: { id: 1, name: 'Ethereum' },
      } as unknown as ReturnType<typeof useAccount>);
      mockUseReadContract.mockReturnValue({
        data: undefined,
      } as unknown as ReturnType<typeof useReadContract>);
      mockUseErc20Transfer.mockReturnValue(DEFAULT_TRANSFER_HOOK);

      render(<TransferForm />);
      expect(
        screen.getByText(/cambiá a una de estas redes/i),
      ).toBeInTheDocument();
    });
  });

  describe('cuando está conectado a Sepolia', () => {
    beforeEach(() => {
      mockConnectedToSepolia();
      mockUseErc20Transfer.mockReturnValue(DEFAULT_TRANSFER_HOOK);
    });

    it('muestra el formulario de transferencia', () => {
      render(<TransferForm />);
      expect(screen.getByLabelText(/dirección destino/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /enviar/i }),
      ).toBeInTheDocument();
    });

    it('el botón de enviar está deshabilitado cuando canExecute es false', () => {
      render(<TransferForm />);
      expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled();
    });

    it('el botón de enviar está habilitado cuando canExecute es true', () => {
      mockUseErc20Transfer.mockReturnValue({
        ...DEFAULT_TRANSFER_HOOK,
        canExecute: true,
      });
      render(<TransferForm />);
      expect(
        screen.getByRole('button', { name: /enviar/i }),
      ).not.toBeDisabled();
    });

    it('muestra error de validación para dirección inválida', () => {
      render(<TransferForm />);
      const input = screen.getByLabelText(/dirección destino/i);
      fireEvent.change(input, { target: { value: 'not-an-address' } });
      expect(screen.getByText(/dirección inválida/i)).toBeInTheDocument();
    });

    it('no muestra error de validación para dirección vacía', () => {
      render(<TransferForm />);
      expect(screen.queryByText(/dirección inválida/i)).not.toBeInTheDocument();
    });

    it('muestra error de validación para monto inválido', () => {
      render(<TransferForm />);
      const input = screen.getByLabelText(/monto/i);
      fireEvent.change(input, { target: { value: '-5' } });
      expect(screen.getByText(/monto positivo válido/i)).toBeInTheDocument();
    });

    it('muestra el error de simulación', () => {
      mockUseErc20Transfer.mockReturnValue({
        ...DEFAULT_TRANSFER_HOOK,
        simulateError: new Error('ERC20: transfer amount exceeds balance'),
      });
      render(<TransferForm />);
      expect(
        screen.getByText('ERC20: transfer amount exceeds balance'),
      ).toBeInTheDocument();
    });

    it('deshabilita los inputs mientras la tx está pendiente', () => {
      mockUseErc20Transfer.mockReturnValue({
        ...DEFAULT_TRANSFER_HOOK,
        status: 'pending',
      });
      render(<TransferForm />);
      expect(screen.getByLabelText(/dirección destino/i)).toBeDisabled();
      expect(screen.getByLabelText(/monto/i)).toBeDisabled();
    });

    it('muestra "Procesando..." mientras la tx está en curso', () => {
      mockUseErc20Transfer.mockReturnValue({
        ...DEFAULT_TRANSFER_HOOK,
        status: 'confirming',
      });
      render(<TransferForm />);
      expect(
        screen.getByRole('button', { name: /procesando/i }),
      ).toBeInTheDocument();
    });
  });

  describe('estado de éxito', () => {
    it('oculta el formulario y muestra el botón de reset', () => {
      mockConnectedToSepolia();
      mockUseErc20Transfer.mockReturnValue({
        ...DEFAULT_TRANSFER_HOOK,
        status: 'success',
        txHash:
          '0xdeadbeefdeadbeefdeadbeefdeadbeef00000000000000000000000000000001' as `0x${string}`,
      });

      render(<TransferForm />);

      expect(
        screen.queryByLabelText(/dirección destino/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /nueva transferencia/i }),
      ).toBeInTheDocument();
    });

    it('llama a reset al hacer clic en "Nueva transferencia"', () => {
      const reset = vi.fn();
      mockConnectedToSepolia();
      mockUseErc20Transfer.mockReturnValue({
        ...DEFAULT_TRANSFER_HOOK,
        status: 'success',
        reset,
      });

      render(<TransferForm />);
      fireEvent.click(
        screen.getByRole('button', { name: /nueva transferencia/i }),
      );
      expect(reset).toHaveBeenCalledOnce();
    });
  });
});
