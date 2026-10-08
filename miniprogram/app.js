const { getCloudEnvId, setCloudEnvId } = require('./utils/env')

App({
  globalData: { cloudReady: false, envId: '', user: null, bootstrap: null },
  onLaunch() { this.initCloud() },
  initCloud(envId) {
    const target = envId || getCloudEnvId()
    this.globalData.envId = target || ''
    try {
      const options = { traceUser: true }
      if (target) options.env = target
      wx.cloud.init(options)
      this.globalData.cloudReady = true
      console.info('[VOID] cloud ready', target || '(default env)')
      return true
    } catch (error) {
      this.globalData.cloudReady = false
      console.error('[VOID] cloud init failed', error)
      return false
    }
  },
  switchCloudEnv(envId) {
    const value = String(envId || '').trim()
    if (!value) return false
    setCloudEnvId(value)
    return this.initCloud(value)
  }
})
