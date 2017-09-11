const pipe = require('pump')
const StreamProvider = require('web3-stream-provider')
const LocalStorageStore = require('obs-store')
const ObjectMultiplex = require('./obj-multiplex')
const createRandomId = require('./random-id')

module.exports = MetamaskInpageProvider

function MetamaskInpageProvider (connectionStream) {
  const self = this

  // setup connectionStream multiplexing
  var multiStream = self.multiStream = ObjectMultiplex()
  pipe(
    connectionStream,
    multiStream,
    connectionStream,
    (err) => logStreamDisconnectWarning('MetaMask', err)
  )

  // subscribe to metamask public config (one-way)
  self.publicConfigStore = new LocalStorageStore({ storageKey: 'MetaMask-Config' })
  pipe(
    multiStream.createStream('publicConfig'),
    self.publicConfigStore,
    (err) => logStreamDisconnectWarning('MetaMask PublicConfigStore', err)
  )

  // ignore phishing warning message (handled elsewhere)
  multiStream.ignoreStream('phishing')

  // connect to async provider
  const asyncProvider = self.asyncProvider = new StreamProvider()
  pipe(
    asyncProvider,
    multiStream.createStream('provider'),
    asyncProvider,
    (err) => logStreamDisconnectWarning('MetaMask RpcProvider', err)
  )
  // start and stop polling to unblock first block lock

  self.idMap = {}
}

// handle sendAsync requests via asyncProvider
// also remap ids inbound and outbound
MetamaskInpageProvider.prototype.sendAsync = function (payload, cb) {
  const self = this

  // rewrite request ids
  const request = eachJsonMessage(payload, (_message) => {
    const message = Object.assign({}, _message)
    const newId = createRandomId()
    self.idMap[newId] = message.id
    message.id = newId
    return message
  })

  // forward to asyncProvider
  self.asyncProvider.sendAsync(request, (err, _res) => {
    if (err) return cb(err)
    // transform messages to original ids
    const res = eachJsonMessage(_res, (message) => {
      const oldId = self.idMap[message.id]
      delete self.idMap[message.id]
      message.id = oldId
      return message
    })
    cb(null, res)
  })
}


MetamaskInpageProvider.prototype.send = function (payload) {
  const self = this

  let selectedAddress
  let result = null
  switch (payload.method) {

    case 'eth_accounts':
      // read from localStorage
      selectedAddress = self.publicConfigStore.getState().selectedAddress
      result = selectedAddress ? [selectedAddress] : []
      break

    case 'eth_coinbase':
      // read from localStorage
      selectedAddress = self.publicConfigStore.getState().selectedAddress
      result = selectedAddress || null
      break

    case 'eth_uninstallFilter':
      self.sendAsync(payload, noop)
      result = true
      break

    case 'net_version':
      const networkVersion = self.publicConfigStore.getState().networkVersion
      result = networkVersion || null
      break

    // throw not-supported Error
    default:
      var link = 'https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md#dizzy-all-async---think-of-metamask-as-a-light-client'
      var message = `The MetaMask Web3 object does not support synchronous methods like ${payload.method} without a callback parameter. See ${link} for details.`
      throw new Error(message)

  }

  // return the result
  return {
    id: payload.id,
    jsonrpc: payload.jsonrpc,
    result: result,
  }
}

MetamaskInpageProvider.prototype.isConnected = function () {
  return true
}

MetamaskInpageProvider.prototype.isMetaMask = true

// util

function eachJsonMessage (payload, transformFn) {
  if (Array.isArray(payload)) {
    return payload.map(transformFn)
  } else {
    return transformFn(payload)
  }
}

function logStreamDisconnectWarning (remoteLabel, err) {
  let warningMsg = `MetamaskInpageProvider - lost connection to ${remoteLabel}`
  if (err) warningMsg += '\n' + err.stack
  console.warn(warningMsg)
}

function noop () {}
