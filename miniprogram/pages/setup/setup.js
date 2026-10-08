const api = require('../../utils/api')

Page({
  data: { envId: '', status: '', initializing: false, report: null, collectionCount: 0, admin: false },
  onLoad() {
    this.setData({ envId: wx.getStorageSync('void_cloud_env') || getApp().globalData.envId || '' })
  },
  onInput(event) { this.setData({ envId: event.detail.value }) },
  validEnvId() {
    const envId = String(this.data.envId || '').trim()
    if (!/^[a-zA-Z0-9_-]{6,}$/.test(envId)) {
      wx.showToast({ title: '请输入正确的云环境 ID', icon: 'none' })
      return ''
    }
    return envId
  },
  save() {
    const envId = this.validEnvId()
    if (!envId) return
    const ok = getApp().switchCloudEnv(envId)
    this.setData({ status: ok ? '已切换到 ' + envId + '，可以继续初始化云环境' : '初始化失败，请检查环境 ID' })
    if (!ok) wx.showToast({ title: '云环境切换失败', icon: 'none' })
  },
  initEnv() {
    const envId = this.validEnvId()
    if (!envId) return
    if (!getApp().switchCloudEnv(envId)) {
      this.setData({ status: '云环境切换失败，请检查环境 ID' })
      return
    }
    this.setData({ initializing: true, status: '正在创建数据集合与示例数据，请稍候…', report: null })
    api.call('setup', {}, { silent: true }).then((data) => {
      this.setData({
        initializing: false,
        report: data,
        collectionCount: (data && data.collections && data.collections.length) || 0,
        admin: !!(data && data.admin),
        status: (data && data.message) || '初始化完成'
      })
      wx.showToast({ title: '初始化完成', icon: 'success' })
    }).catch((error) => {
      this.setData({ initializing: false, status: '初始化失败：' + error.message })
      wx.showToast({ title: error.message, icon: 'none', duration: 3200 })
    })
  },
  goLogin() { wx.reLaunch({ url: '/pages/login/login' }) }
})