const api = require('../../utils/api')
const fmt = require('../../utils/format')

function codeTail (id) {
  const text = String(id || '')
  return text.length > 6 ? text.slice(-6) : text
}

function decorate (list) {
  return (list || []).map((x) => Object.assign({}, x, {
    priceText: fmt.money(x.price),
    codeText: codeTail(x.id)
  }))
}

Page({
  data: { serviceTypes: [], activeType: '', keyword: '', sort: 'default', companions: [], loading: false, error: '' },
  onLoad(options) { this.setData({ activeType: options.serviceTypeId || '' }); this.load() },
  onShow() { if (this.data.serviceTypes.length) this.loadCompanions() },
  load() {
    this.setData({ loading: true, error: '' })
    Promise.all([
      api.call('services.types'),
      api.call('companions.list', { serviceTypeId: this.data.activeType, keyword: this.data.keyword, sort: this.data.sort })
    ]).then(([types, list]) => {
      this.setData({ loading: false, serviceTypes: types || [], companions: decorate(list) })
    }).catch((error) => this.setData({ loading: false, error: error.message }))
  },
  loadCompanions() {
    this.setData({ loading: true, error: '' })
    api.call('companions.list', { serviceTypeId: this.data.activeType, keyword: this.data.keyword, sort: this.data.sort })
      .then((list) => this.setData({ loading: false, companions: decorate(list) }))
      .catch((error) => this.setData({ loading: false, error: error.message }))
  },
  selectType(event) { const id = event.currentTarget.dataset.id || ''; this.setData({ activeType: id }); this.loadCompanions() },
  selectSort(event) { this.setData({ sort: event.currentTarget.dataset.sort || 'default' }); this.loadCompanions() },
  onKeyword(event) { this.setData({ keyword: event.detail.value || '' }) },
  search() { this.loadCompanions() },
  openCompanion(event) { wx.navigateTo({ url: '/pages/service-detail/service-detail?id=' + encodeURIComponent(event.currentTarget.dataset.id) }) }
})