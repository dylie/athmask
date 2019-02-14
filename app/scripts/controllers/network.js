const assert=require('assert')
const EventEmitter=require('events')
const createMetamaskProvider=require('web3-provider-engine/zero.js')
const createInfuraProvider=require('eth-json-rpc-infura/src/createProvider')
const ObservableStore=require('obs-store')
const ComposedStore=require('obs-store/lib/composed')
const extend=require('xtend')
const EthQuery=require('eth-query')
const createEventEmitterProxy=require('../lib/events-proxy.js')
const RPC_ADDRESS_LIST=require('../config.js').network
const ALTERNATIVE_CHAINS=require('../config.js').networkIdAlterantiveChains
const DEFAULT_RPC=RPC_ADDRESS_LIST.rinkeby
const INFURA_PROVIDER_TYPES=['ropsten','rinkeby','kovan','mainnet']
module.exports=class NetworkController extends EventEmitter{constructor(config){super()
config.provider.rpcTarget=this.getRpcAddressForType(config.provider.type,config.provider)
this.networkStore=new ObservableStore('loading')
this.providerStore=new ObservableStore(config.provider)
this.store=new ComposedStore({provider:this.providerStore,network:this.networkStore})
this._proxy=createEventEmitterProxy()
this.on('networkDidChange',this.lookupNetwork)}
initializeProvider(_providerParams){this._baseProviderParams=_providerParams
const{type,rpcTarget}=this.providerStore.getState()
const opts={type,rpcUrl:rpcTarget,}
this._configureProvider(opts)
this._proxy.on('block',this._logBlock.bind(this))
this._proxy.on('error',this.verifyNetwork.bind(this))
this.ethQuery=new EthQuery(this._proxy)
this.lookupNetwork()
return this._proxy}
verifyNetwork(){if(this.isNetworkLoading())this.lookupNetwork()}
getNetworkState(){return this.networkStore.getState()}
setNetworkState(network){return this.networkStore.putState(network)}
isNetworkLoading(){return this.getNetworkState()==='loading'}
lookupNetwork(){if(!this.ethQuery||!this.ethQuery.sendAsync){return log.warn('NetworkController - lookupNetwork aborted due to missing ethQuery')}
this.ethQuery.sendAsync({method:'net_version'},(err,network)=>{if(err)return this.setNetworkState('loading')
log.info('web3.getNetwork returned '+network)
this.alternativeChainId=this.getNetworkIdOverwrite(this.getProviderConfig().type)
if(this.alternativeChainId){this.setNetworkState(this.alternativeChainId)}else{this.setNetworkState(network)}})}
setRpcTarget(rpcUrl){this.providerStore.updateState({type:'rpc',rpcTarget:rpcUrl,})
this._switchNetwork({rpcUrl})}
getCurrentRpcAddress(){const provider=this.getProviderConfig()
if(!provider)return null
return this.getRpcAddressForType(provider.type)}
async setProviderType(type){assert(type!=='rpc',`NetworkController.setProviderType - cannot connect by type "rpc"`)
if(type===this.getProviderConfig().type)return
const rpcTarget=this.getRpcAddressForType(type)
assert(rpcTarget,`NetworkController - unknown rpc address for type "${type}"`)
this.providerStore.updateState({type,rpcTarget})
this._switchNetwork({type})}
getProviderConfig(){return this.providerStore.getState()}
getRpcAddressForType(type,provider=this.getProviderConfig()){if(RPC_ADDRESS_LIST[type])return RPC_ADDRESS_LIST[type]
return provider&&provider.rpcTarget?provider.rpcTarget:DEFAULT_RPC}
getNetworkIdOverwrite(type){return ALTERNATIVE_CHAINS[type]}
_switchNetwork(opts){this.setNetworkState('loading')
this._configureProvider(opts)
this.emit('networkDidChange')}
_configureProvider(opts){const{type}=opts
if(type){const isInfura=INFURA_PROVIDER_TYPES.includes(type)
opts.rpcUrl=this.getRpcAddressForType(type)
if(isInfura){this._configureInfuraProvider(opts)}else{this._configureStandardProvider(opts)}}else{this._configureStandardProvider(opts)}}
_configureInfuraProvider(opts){log.info('_configureInfuraProvider',opts)
const blockTrackerProvider=createInfuraProvider({network:opts.type,})
const providerParams=extend(this._baseProviderParams,{rpcUrl:opts.rpcUrl,engineParams:{pollingInterval:8000,blockTrackerProvider,},})
const provider=createMetamaskProvider(providerParams)
this._setProvider(provider)}
_configureStandardProvider({rpcUrl}){const providerParams=extend(this._baseProviderParams,{rpcUrl,engineParams:{pollingInterval:8000,},})
const provider=createMetamaskProvider(providerParams)
this._setProvider(provider)}
_setProvider(provider){const oldProvider=this._provider
let blockTrackerHandlers
if(oldProvider){blockTrackerHandlers=oldProvider._blockTracker.proxyEventHandlers
oldProvider.removeAllListeners()
oldProvider.stop()}
provider._blockTracker=createEventEmitterProxy(provider._blockTracker,blockTrackerHandlers)
this._provider=provider
this._proxy.setTarget(provider)}
_logBlock(block){log.info(`BLOCK CHANGED: #${block.number.toString('hex')} 0x${block.hash.toString('hex')}`)
this.verifyNetwork()}}