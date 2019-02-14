const BN=require('ethereumjs-util').BN
const normalize=require('eth-sig-util').normalize
class PendingBalanceCalculator{constructor({getBalance,getPendingTransactions}){this.getPendingTransactions=getPendingTransactions
this.getNetworkBalance=getBalance}
async getBalance(){const results=await Promise.all([this.getNetworkBalance(),this.getPendingTransactions(),])
const[balance,pending]=results
if(!balance)return undefined
const pendingValue=pending.reduce((total,tx)=>{return total.add(this.calculateMaxCost(tx))},new BN(0))
return `0x${balance.sub(pendingValue).toString(16)}`}
calculateMaxCost(tx){const txValue=tx.txParams.value
const value=this.hexToBn(txValue)
const gasPrice=this.hexToBn(tx.txParams.gasPrice)
const gas=tx.txParams.gas
const gasLimit=tx.txParams.gasLimit
const gasLimitBn=this.hexToBn(gas||gasLimit)
const gasCost=gasPrice.mul(gasLimitBn)
return value.add(gasCost)}
hexToBn(hex){return new BN(normalize(hex).substring(2),16)}}
module.exports=PendingBalanceCalculator