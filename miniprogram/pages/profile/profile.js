const api = require('../../utils/api')
const fmt = require('../../utils/format')

function tail (value, len) {
  const text = String(value || '')
  return text.length > len ? text.slice(-len) : text
}

Page({
  data: { user: null, profile: null, counts: null, nicknameInitial: 'V', openidTail: '', loading: true, error: '' },
  onShow() { this.load() },
  load() {
    this.setData({ loading: true, error: '' })
    api.call('profile.me').then((data) => {
      const app = getApp()
      app.globalData.user = data.user
      const profile = data.profile || { contributionScore: 0, postCount: 0 }
      this.setData({
        loading: false,
        user: data.user,
        profile,
        counts: data.counts || { orders: 0 },
        nicknameInitial: fmt.userInitial(data.user && data.user.nickname, 'V'),
        openidTail: tail(data.user && data.user.openid, 10)
      })
    }).catch((error) => this.setData({ loading: false, error: error.message }))
  },
  openOrders() { wx.navigateTo({ url: '/pages/orders/orders' }) },
  openCommunity() { wx.switchTab({ url: '/pages/community/community' }) },
  openFighter() { wx.navigateTo({ url: '/pages/fighter/fighter' }) },
  openAdmin() { wx.navigateTo({ url: '/pages/admin/admin' }) },
  openSetup() { wx.navigateTo({ url: '/pages/setup/setup' }) },
  logout() {
    getApp().globalData.user = null
    wx.removeStorageSync('void_profile')
    wx.reLaunch({ url: '/pages/login/login' })
  }
})