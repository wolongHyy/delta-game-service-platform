const api = require('../../utils/api')
const fmt = require('../../utils/format')
Page({
  data: { loading: true, item: null, error: '' },
  onLoad(options) { this.id = options.id || ''; this.load() },
  load() {
    if (!this.id) { this.setData({ loading: false, error: '缺少服务编号' }); return }
    api.call('companions.get', { id: this.id }).then((item) => this.setData({ loading: false, item: Object.assign({}, item, { priceText: fmt.money(item.price), tagsText: (item.tags || []).join(' · ') }) })).catch((error) => this.setData({ loading: false, error: error.message }))
  },
  order() { wx.navigateTo({ url: '/pages/order-create/order-create?companionId=' + encodeURIComponent(this.id) }) },
  contact() { wx.switchTab({ url: '/pages/messages/messages' }) }
})
