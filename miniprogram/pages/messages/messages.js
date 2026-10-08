const api = require('../../utils/api')
Page({
  data: { messages: [], loading: true, error: '' },
  onShow() { this.load() },
  load() { this.setData({ loading: true }); api.call('messages.list').then((list) => this.setData({ loading: false, messages: list || [] })).catch((error) => this.setData({ loading: false, error: error.message })) },
  openAi() { wx.navigateTo({ url: '/pages/ai-chat/ai-chat' }) },
  openNotifications() { wx.navigateTo({ url: '/pages/notifications/notifications' }) }
})
