const extension=require('extensionizer')
const noop=function(){}
const apis=['alarms','bookmarks','browserAction','commands','contextMenus','cookies','downloads','events','extension','extensionTypes','history','i18n','idle','notifications','pageAction','runtime','storage','tabs','webNavigation','webRequest','windows',]
apis.forEach(function(api){extension[api]={}})
extension.runtime.reload=noop
extension.tabs.create=noop