import { useCallback, useEffect, useRef, useState } from 'react'
import store from 'store2'
import log from '../lib/log'
import useSuiWallet from './useSuiWallet'
import listenForMobileConnection from '../lib/listenForMobileConnection'
import { ProviderAndSigner } from '../types/ProviderAndSigner'
import { Connection, JsonRpcProvider } from '@mysten/sui.js';
import { ExtensionSigner, HostedSigner } from 'types/Signer'
import lib from '../lib/lib'
import { EthosConfiguration } from '../types/EthosConfiguration'
import { DEFAULT_NETWORK } from '../lib/constants';

const useConnect = (ethosConfiguration?: EthosConfiguration) => {
  const signerFound = useRef<boolean>(false)
  const methodsChecked = useRef<any>({
    'ethos': false,
    // 'mobile': false,
    'extension': false
  })

  const [providerAndSigner, setProviderAndSigner] = useState<ProviderAndSigner>({
    provider: null,
    signer: null
  })

  const {
    wallets,
    selectWallet,
    connected,
    connecting,
    noConnection: suiNoConnection,
    signer: suiSigner,
    setSigner: setSuiSigner
  } = useSuiWallet();

  const [logoutCount, setLogoutCount] = useState(0);
  const logout = useCallback(() => {
    const suiStore = store.namespace('sui')
    suiStore('disconnected', true);

    signerFound.current = false;
    setProviderAndSigner((prev: ProviderAndSigner) => ({ ...prev, signer: null }))
    setSuiSigner(null);
    for (const key of Object.keys(methodsChecked.current)) {
      methodsChecked.current[key] = false;
    }
    setLogoutCount(prev => prev + 1);
  }, [])

  const checkSigner = useCallback((signer: ExtensionSigner | HostedSigner | null, type?: string) => {
    log("useConnect", "trying to set providerAndSigner", type, signerFound.current, methodsChecked.current)
    if (signerFound.current) return;

    if (type) {
      methodsChecked.current[type] = true;
    }

    const allMethodsChecked = !Object.values(methodsChecked.current).includes(false)
    if (!signer && !allMethodsChecked) return;

    signerFound.current = !!signer;

    const network = typeof ethosConfiguration?.network === "string" ? ethosConfiguration.network : DEFAULT_NETWORK
    const connection = new Connection({ fullnode: network })
    const provider = new JsonRpcProvider(connection);

    setProviderAndSigner({ provider, signer })
  }, [logoutCount]);

  useEffect(() => {
    if (!ethosConfiguration) return;

    log("mobile", "listening to mobile connection from EthosConnectProvider")
    listenForMobileConnection(
      (mobileSigner: any) => {
        log('useConnect', 'Setting providerAndSigner mobile', mobileSigner)
        log("mobile", "Setting provider and signer", mobileSigner)
        checkSigner(mobileSigner, 'mobile')
      }
    )
  }, [checkSigner, ethosConfiguration])

  useEffect(() => {
    if (!ethosConfiguration) return;

    log('useConnect', 'Setting providerAndSigner extension', suiSigner, suiNoConnection)
    if (!suiNoConnection && !suiSigner) return

    checkSigner(suiSigner, 'extension')
  }, [suiNoConnection, suiSigner, checkSigner, ethosConfiguration])

  useEffect(() => {
    if (!ethosConfiguration) return;

    if (!ethosConfiguration.apiKey) {
      log('useConnect', 'Setting null providerAndSigner ethos');
      checkSigner(null, 'ethos');
      return;
    }

    const fetchEthosSigner = async () => {
      const signer = await lib.getEthosSigner()
      log('useConnect', 'Setting providerAndSigner ethos', signer)
      checkSigner(signer, 'ethos');
    }

    fetchEthosSigner()
  }, [checkSigner, ethosConfiguration])

  return { wallets, selectWallet, providerAndSigner, logout, connecting, connected };
}

export default useConnect;