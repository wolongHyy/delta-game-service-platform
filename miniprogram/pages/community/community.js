const api = require('../../utils/api')
const fmt = require('../../utils/format')
Page({
  data: { channels: [{ id: 'recommend', label: '推荐' }, { id: 'follow', label: '关注' }, { id: 'knowledge', label: '知识库' }, { id: 'latest', label: '最新' }], channel: 'recommend', posts: [], stats: null, topics: [], loading: true, error: '' },
  onShow() { this.load() },
  load() { this.setData({ loading: true, error: '' }); api.call('community.list', { channel: this.data.channel, pageSize: 20 }).then((data) => this.setData({ loading: false, posts: (data.posts || []).map(fmt.normalizePost), stats: data.stats || null, topics: data.topics || [] })).catch((error) => this.setData({ loading: false, error: error.message })) },
  select(event) { this.setData({ channel: event.currentTarget.dataset.id || 'recommend' }); this.load() },
  openPost(event) { wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + encodeURIComponent(event.currentTarget.dataset.id) }) },
  createPost() { wx.navigateTo({ url: '/pages/post-create/post-create' }) },
  openNotifications() { wx.navigateTo({ url: '/pages/notifications/notifications' }) }
})
