// Ambient declarations to keep TypeScript happy in environments without installed deps during lint
declare module 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export {};

