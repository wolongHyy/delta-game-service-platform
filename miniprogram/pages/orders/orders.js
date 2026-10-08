const api = require('../../utils/api')
const fmt = require('../../utils/format')
Page({
  data: { filters: [{ id: '', label: '全部' }, { id: 'unpaid', label: '待付款' }, { id: 'payment_review', label: '待核销' }, { id: 'pending', label: '待接单' }, { id: 'in_progress', label: '服务中' }, { id: 'completed', label: '已完成' }], status: '', orders: [], loading: true, error: '' },
  onShow() { this.load() },
  load() { this.setData({ loading: true, error: '' }); api.call('orders.list', { status: this.data.status }).then((list) => this.setData({ loading: false, orders: (list || []).map(fmt.normalizeOrder) })).catch((error) => this.setData({ loading: false, error: error.message })) },
  select(event) { this.setData({ status: event.currentTarget.dataset.id || '' }); this.load() },
  detail(event) { wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + encodeURIComponent(event.currentTarget.dataset.id) }) },
  create() { wx.switchTab({ url: '/pages/services/services' }) }
})
