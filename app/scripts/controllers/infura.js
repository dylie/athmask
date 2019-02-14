const ObservableStore=require('obs-store')
const extend=require('xtend')
const POLLING_INTERVAL=10*60*1000
class InfuraController{constructor(opts={}){const initState=extend({infuraNetworkStatus:{},},opts.initState)
this.store=new ObservableStore(initState)}
checkInfuraNetworkStatus(){return fetch('https://api.infura.io/v1/status/metamask').then(response=>response.json()).then((parsedResponse)=>{this.store.updateState({infuraNetworkStatus:parsedResponse,})
return parsedResponse})}
scheduleInfuraNetworkCheck(){if(this.conversionInterval){clearInterval(this.conversionInterval)}
this.conversionInterval=setInterval(()=>{this.checkInfuraNetworkStatus()},POLLING_INTERVAL)}}
module.exports=InfuraController