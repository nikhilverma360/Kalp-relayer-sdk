// Minimal stub so TypeScript can compile without the real ethers typings installed.
declare module 'ethers' {
  export namespace providers {
    class Web3Provider {
      constructor(provider: any);
      getSigner(): any;
    }
  }

  export class Wallet {
    constructor(privateKey?: string);
    static createRandom(): Wallet;
    _signTypedData(domain: any, types: any, value: any): Promise<string>;
  }

  export const ethers: any;
  const _default: any;
  export default _default;
}

