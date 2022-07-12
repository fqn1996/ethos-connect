import getConfiguration from './getConfiguration'
import getIframe from './getIframe'
import log from './log'
// import postMessage from './postMessage'

const activeUser = () => {
  console.log('ACTIVE USER')
  const { walletAppUrl, appId } = getConfiguration()

  const resolver = (resolve: any) => {
    const listener = (message: any) => {
      log('activeUser', 'MESSAGE ORIGIN: ', message.origin, walletAppUrl, message)
      if (message.origin === walletAppUrl) {
        const { action, data } = message.data
        log('MESSAGE2: ', action, data)
        if (action === 'user' && data.appId === appId) {
          window.removeEventListener('message', listener)
          resolve(data?.user)
        }
      }
    }
    window.addEventListener('message', listener)

    // Compiler isn't handling postMessage
    const message = { action: 'activeUser' }
    const iframe = getIframe()
    console.log('API POST MESSAGE ACTION')
    iframe?.contentWindow?.postMessage(message, '*')
    // postMessage(message)
  }

  return new Promise(resolver)
}

export default activeUser
