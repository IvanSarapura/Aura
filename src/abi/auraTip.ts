export const auraTipAbi = [
  {
    type: 'event',
    name: 'TipSent',
    anonymous: false,
    inputs: [
      { name: 'from', type: 'address', internalType: 'address', indexed: true },
      { name: 'to', type: 'address', internalType: 'address', indexed: true },
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
        indexed: false,
      },
      {
        name: 'category',
        type: 'string',
        internalType: 'string',
        indexed: false,
      },
      {
        name: 'message',
        type: 'string',
        internalType: 'string',
        indexed: false,
      },
    ],
  },
  {
    type: 'function',
    name: 'tipsReceivedCount',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'function',
    name: 'tipsSentCount',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'function',
    name: 'tip',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'category', type: 'string', internalType: 'string' },
      { name: 'message', type: 'string', internalType: 'string' },
    ],
    outputs: [],
  },
] as const;
