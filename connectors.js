import { InjectedConnector } from '@web3-react/injected-connector'

const POLLING_INTERVAL = 12000
const RPC_URLS = {
  1: 'https://mainnet.infura.io/v3/'
}

export const injected = new InjectedConnector({ supportedChainIds: [1] })