const inherits=require('util').inherits
const Component=require('react').Component
const h=require('react-hyperscript')
module.exports=Mascot
inherits(Mascot,Component)
function Mascot()
{Component.call(this)}
Mascot.prototype.render=function(){return h('img',{height:200,width:200,src:'/images/icon-512.png',})}