const api = require('../../utils/api')
const fmt = require('../../utils/format')
Page({
  data: { loading: true, item: null, unitCount: 1, spec: '', gameField: '', gameMode: '', mapName: '', inGameId: '', rank: '', remark: '', sourcePostId: '', amountText: '0', submitting: false, error: '' },
  onLoad(options) {
    this.companionId = options.companionId || ''
    this.setData({ sourcePostId: options.sourcePostId || '' })
    api.call('companions.get', { id: this.companionId }).then((item) => { this.setData({ loading: false, item, spec: (item.tags || [])[0] || '', amountText: fmt.money(Number(item.price || 0)) }) }).catch((error) => this.setData({ loading: false, error: error.message }))
  },
  onField(event) { const key = event.currentTarget.dataset.field; const value = event.detail.value || ''; this.setData({ [key]: value }) },
  step(event) { const delta = Number(event.currentTarget.dataset.delta || 0); const next = Math.min(24, Math.max(1, Number(this.data.unitCount || 1) + delta)); this.setData({ unitCount: next }); this.refreshAmount(next) },
  refreshAmount(count) { if (!this.data.item) return; this.setData({ amountText: fmt.money(Number(this.data.item.price || 0) * count) }) },
  submit() {
    if (!this.data.item) return
    if (!String(this.data.inGameId || '').trim()) { wx.showToast({ title: '请填写游戏 ID', icon: 'none' }); return }
    this.setData({ submitting: true, error: '' })
    const payload = { companionId: this.companionId, unitCount: Number(this.data.unitCount || 1), spec: this.data.spec, gameField: this.data.gameField, gameMode: this.data.gameMode, mapName: this.data.mapName, inGameId: this.data.inGameId, rank: this.data.rank, remark: this.data.remark, sourcePostId: this.data.sourcePostId, idempotencyKey: 'mini-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) }
    api.call('orders.create', payload).then((order) => wx.redirectTo({ url: '/pages/order-detail/order-detail?id=' + encodeURIComponent(order.id) })).catch((error) => { this.setData({ submitting: false, error: error.message }); api.toastError(error) })
  }
})
