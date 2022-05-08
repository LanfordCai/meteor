import Head from 'next/head'

import { Web3ReactProvider, useWeb3React, UnsupportedChainIdError } from '@web3-react/core'
import {
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected
} from '@web3-react/injected-connector'
import {  Web3Provider } from '@ethersproject/providers'
import { useState, useEffect, createContext, useContext, useReducer } from 'react'
import { ethers } from "ethers"
import { useEagerConnect, useInactiveListener } from '../hooks'

import * as fcl from "@onflow/fcl";
import config from "../flow/config.js"
import validator from '../flow/validator'

import NavigationBar from '../components/NavigationBar'
import { injected } from '../connectors'

const defaultGlobalState = {
  message: "",
  publicKey: "",
  signature:"" 
}

const globalStateContext = createContext(defaultGlobalState);
const dispatchStateContext = createContext(undefined);

const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(
    (state, newValue) => ({ ...state, ...newValue }),
    defaultGlobalState
  );
  return (
    <globalStateContext.Provider value={state}>
      <dispatchStateContext.Provider value={dispatch}>
        {children}
      </dispatchStateContext.Provider>
    </globalStateContext.Provider>
  )
}

const useGlobalState = () => [
  useContext(globalStateContext),
  useContext(dispatchStateContext)
]

function FlowButton() {
  const [state, dispatch] = useGlobalState()
  const [user, setUser] = useState({loggedIn: null})
  const [isValid, setIsValid] = useState('Unknown')
  useEffect(() => fcl.currentUser.subscribe(setUser), [])

  const AuthedState = () => {
    return (
      <>
        <label>{user?.addr ?? "No Address"}</label>
        <label>Is Valid Signature: {isValid}</label>
        <div className='flex items-center gap-2'>
        <button
          type="button"
          className="h-14 mt-8 mb-8 w-40 items-center px-6 py-3 border border-transparent text-base font-medium shadow-sm text-black bg-flow-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-flow-green"
          onClick={async () => {
            console.log("verify")
            // 04 is the prefix of uncompressed public key in bitcon/ethereum's ecdsa, delete it.
            const publicKey = state.publicKey.replace('0x04', '')
            // ethereum's signature contains v value in the last byte, delete it.
            const signature = state.signature.replace('0x', '').slice(0, -2)

            let isValid = false
            try {
              isValid = await validator.verify(state.message, publicKey, signature)
            } catch (error) {
              window.alert('Failure!' + (error && error.message ? `\n\n${error.message}` : ''))
              isValid = false
            }

            setIsValid(isValid ? 'true' : 'false')
          }}
          >
            Verify
        </button>
        <button
          type="button"
          className="h-14 mt-8 mb-8 w-40 items-center px-6 py-3 border border-transparent text-base font-medium shadow-sm text-black bg-flow-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-flow-green"
          onClick={fcl.unauthenticate}
          >
            Disconnect
        </button>
        </div>
      </>
    )
  }

  const UnauthenticatedState = () => {
    return (
      <div>
        <button
          type="button"
          className="h-14 mt-8 mb-20 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium shadow-sm text-black bg-flow-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-flow-green"
          onClick={fcl.logIn}
          >
          Connect Wallet
        </button>
      </div>
    )
  }

  return (
    <>
      {user.loggedIn
        ? <AuthedState />
        : <UnauthenticatedState />
      }
    </>
  )
}

function MetamaskButton() {
  const [state, dispatch] = useGlobalState()
  const context = useWeb3React()
  const { connector, library, chainId, account, activate, deactivate, active, error } = context
  const [message, setMessage] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [signature, setSignature] = useState('')

  useEffect(() => {
    setMessage(account)
  }, [account])

  // handle logic to recognize the connector currently being activated
  const [activatingConnector, setActivatingConnector] = useState()

  useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined)
    }
  }, [activatingConnector, connector])

  // handle logic to eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect()

  // handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector)

  const currentConnector = injected
  const activating = currentConnector === activatingConnector
  const connected = currentConnector === connector
  const disabled = !triedEager || !!activatingConnector || connected || !!error

  if (!(connected && account)) {
    return (
      <button
      type="button"
      className="h-14 mt-8 mb-8 px-6 py-3 border border-transparent text-base font-medium shadow-sm text-white bg-metamask-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-metamask-orange"
      onClick={() => {
        setActivatingConnector(currentConnector)
        activate(injected)
      }}
      >
        Connect Wallet
    </button>
    )
  }

  return (
    <>
      <textarea 
        value={`ETH Address: ${account}`} 
        readOnly={true}
        rows={2}
        className='w-full mt-2 mb-2 resize-none'
      /> 
      <textarea 
        value={`Message: ${message}`} 
        readOnly={true}
        rows={2}
        className='w-full mt-2 mb-2 resize-none'
      /> 
      <textarea 
        value={`PublicKey: ${publicKey}`} 
        readOnly={true}
        rows={3}
        className='w-full mt-2 mb-2 resize-none'
      />
      <textarea 
        value={`Signature: ${signature}`} 
        readOnly={true}
        rows={3}
        className='w-full mt-2 mb-2 resize-none'
      />
      <div className='flex items-center gap-2'>
      <button
        type="button"
        className="h-14 mt-8 mb-8 w-40 px-6 py-3 border border-transparent text-base font-medium shadow-sm text-white bg-metamask-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-metamask-orange"
        onClick={() => {
          const digest = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message))

          library
          .getSigner(account)
          .signMessage(account)
          .then((signature) => {
            const publicKey = ethers.utils.recoverPublicKey(digest, signature)
            setPublicKey(publicKey)
            setSignature(signature)
            dispatch({ message: message})
            dispatch({ publicKey: publicKey })
            dispatch({ signature: signature })
          })
          .catch((error) => {
            window.alert('Failure!' + (error && error.message ? `\n\n${error.message}` : ''))
          })
        }}
        >
          Sign
      </button>
      <button
        type="button"
        className="h-14 mt-8 mb-8 w-40 px-6 py-3 border border-transparent text-base font-medium shadow-sm text-white bg-metamask-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-metamask-orange"
        onClick={() => {
          deactivate()
        }}
        >
          Disconnect
      </button>
      </div>
    </>
  )
}

function getLibrary(provider) {
  const library = new Web3Provider(provider)
  library.pollingInterval = 12000
  return library
}

function App() {
  return (
    <>
    <Head>
      <title>meteor</title>
      <meta property="og:title" content="meteor" key="title" />
    </Head>

    <div className="container mx-auto max-w-[680px] min-w-[350px] px-8">
      <NavigationBar />

      <div className="flex flex-col items-center mt-16" >
        {MetamaskButton()}
        {FlowButton()}
      </div>
    </div>
    </>
  )
}

function getErrorMessage(error) {
  if (error instanceof NoEthereumProviderError) {
    return 'No Ethereum browser extension detected, install MetaMask on desktop or visit from a dApp browser on mobile.'
  } else if (error instanceof UnsupportedChainIdError) {
    return "You're connected to an unsupported network."
  } else if (
    error instanceof UserRejectedRequestErrorInjected ||
    error instanceof UserRejectedRequestErrorWalletConnect ||
    error instanceof UserRejectedRequestErrorFrame
  ) {
    return 'Please authorize this website to access your Ethereum account.'
  } else {
    console.error(error)
    return 'An unknown error occurred. Check the console for more details.'
  }
}

export default function Home() {
  return (
    <GlobalStateProvider>
      <Web3ReactProvider getLibrary={getLibrary}>
          <App />
      </Web3ReactProvider>
    </GlobalStateProvider>
  )
}
