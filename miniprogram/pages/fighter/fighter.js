const api = require('../../utils/api')
const fmt = require('../../utils/format')
Page({
  data: { mode: 'orders', dashboard: null, orders: [], application: null, form: { gameName: '', contact: '', rank: '', modesText: '', intro: '' }, loading: true, submitting: false, error: '' },
  onShow() { this.load() },
  load() { this.setData({ loading: true, error: '' }); api.call('fighter.dashboard').then((data) => this.setData({ loading: false, dashboard: data, orders: (data.orders || []).map(fmt.normalizeOrder), application: data.application || null })).catch((error) => this.setData({ loading: false, error: error.message, application: null })) },
  setMode(event) { this.setData({ mode: event.currentTarget.dataset.mode || 'orders' }) },
  onField(event) { const key = event.currentTarget.dataset.field; this.setData({ ['form.' + key]: event.detail.value || '' }) },
  apply() { const f = this.data.form; if (!f.gameName || !f.contact) { wx.showToast({ title: '请填写游戏名和联系方式', icon: 'none' }); return }; this.setData({ submitting: true }); api.call('fighter.apply', { gameName: f.gameName, contact: f.contact, rank: f.rank, modes: String(f.modesText || '').split(/[，,]/).filter(Boolean), intro: f.intro }).then(() => { this.setData({ submitting: false }); wx.showToast({ title: '申请已提交', icon: 'success' }); this.load() }).catch((error) => { this.setData({ submitting: false }); api.toastError(error) }) },
  action(event) { const id = event.currentTarget.dataset.id; const action = event.currentTarget.dataset.action; api.call('fighter.' + action, { id }).then(() => this.load()).catch(api.toastError) }
})
