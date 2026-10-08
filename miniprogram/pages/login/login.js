const api = require('../../utils/api')

function tail (value, len) {
  const text = String(value || '')
  return text.length > len ? text.slice(-len) : text
}

Page({
  data: { checking: true, openid: '', openidTail: '', nickname: '', avatarUrl: '', phone: '', error: '', saving: false, cloudHint: '' },
  onLoad() { this.checkSession() },
  onShow() {
    const saved = wx.getStorageSync('void_profile') || {}
    if (saved.nickname) this.setData({ nickname: saved.nickname, avatarUrl: saved.avatarUrl || '' })
  },
  checkSession() {
    this.setData({ checking: true, error: '', cloudHint: '' })
    api.call('auth.session', {}, { silent: true }).then((data) => {
      const app = getApp()
      app.globalData.user = data.user || null
      this.setData({
        checking: false,
        openid: data.openid || '',
        openidTail: tail(data.openid, 8),
        phone: (data.user && data.user.phone) || '',
        nickname: (data.user && data.user.nickname) || this.data.nickname,
        avatarUrl: (data.user && data.user.avatarUrl) || this.data.avatarUrl
      })
      if (data.user && data.user.nickname) setTimeout(() => wx.switchTab({ url: '/pages/home/home' }), 240)
    }).catch((error) => {
      this.setData({ checking: false, error: error.message, cloudHint: '如果刚部署完云函数，请先完成“云开发设置”里的初始化。' })
    })
  },
  onChooseAvatar(event) { this.setData({ avatarUrl: event.detail.avatarUrl || '' }) },
  onNicknameInput(event) { this.setData({ nickname: event.detail.value || '' }) },
  saveProfile() {
    const nickname = String(this.data.nickname || '').trim()
    if (nickname.length < 2) { wx.showToast({ title: '昵称至少 2 个字', icon: 'none' }); return }
    this.setData({ saving: true, error: '' })
    api.call('auth.updateProfile', { nickname, avatarUrl: this.data.avatarUrl || '' }).then((data) => {
      const app = getApp()
      app.globalData.user = data.user
      wx.setStorageSync('void_profile', data.user)
      wx.showToast({ title: '已进入指挥台', icon: 'success' })
      setTimeout(() => wx.switchTab({ url: '/pages/home/home' }), 300)
    }).catch((error) => { this.setData({ saving: false, error: error.message }); api.toastError(error) })
  },
  onGetPhoneNumber(event) {
    if (!event.detail.code) { this.setData({ error: '未授权手机号' }); return }
    this.setData({ saving: true, error: '' })
    api.call('auth.bindPhone', { code: event.detail.code }).then((data) => {
      this.setData({ phone: data.phone || '', saving: false })
      wx.showToast({ title: '手机号已绑定', icon: 'success' })
    }).catch((error) => { this.setData({ saving: false, error: error.message }); api.toastError(error) })
  },
  goSetup() { wx.navigateTo({ url: '/pages/setup/setup' }) }
})