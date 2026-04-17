export const auraTipAbi = [
  {
    type: 'constructor',
    inputs: [{ name: '_usdm', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'TipSent',
    anonymous: false,
    inputs: [
      { name: 'from', type: 'address', internalType: 'address', indexed: true },
      { name: 'to', type: 'address', internalType: 'address', indexed: true },
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
    name: 'tip',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'category', type: 'string', internalType: 'string' },
      { name: 'message', type: 'string', internalType: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'usdm',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'contract IERC20' }],
  },
] as const;
