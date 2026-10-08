function call(action, payload, options) {
  const data = Object.assign({ action: String(action || '') }, payload || {})
  const silent = options && options.silent
  return new Promise((resolve, reject) => {
    const app = getApp()
    if (!app || !app.globalData.cloudReady) { reject(new Error('云开发尚未初始化，请先进入“云开发设置”')); return }
    wx.cloud.callFunction({
      name: 'void-api',
      data,
      success(res) {
        const result = res && res.result
        if (result && result.ok) { resolve(result.data); return }
        const message = (result && (result.error || result.message)) || '云端返回异常'
        if (!silent) console.warn('[VOID] api error', action, result)
        reject(new Error(message))
      },
      fail(error) {
        if (!silent) console.warn('[VOID] callFunction failed', action, error)
        const message = String((error && (error.errMsg || error.message)) || '云函数调用失败')
        reject(new Error(message.indexOf('FunctionName') >= 0 || message.indexOf('not found') >= 0 ? '尚未部署 void-api 云函数，请按 README 完成部署' : message))
      }
    })
  })
}
function toastError(error) { wx.showToast({ title: (error && error.message) || '操作失败', icon: 'none', duration: 2600 }) }
function requireLogin() {
  try { const user = getApp().globalData.user; if (user && user.openid) return true } catch (error) {}
  wx.navigateTo({ url: '/pages/login/login' })
  return false
}
module.exports = { call, toastError, requireLogin }
