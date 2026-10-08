const api = require('../../utils/api')

function ext (filePath) {
  const text = String(filePath || '')
  const index = text.lastIndexOf('.')
  if (index < 0) return 'jpg'
  return text.slice(index + 1).replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) || 'jpg'
}

Page({
  data: {
    title: '',
    content: '',
    topic: '战术交流',
    tagsText: '',
    companions: [],
    serviceIndex: 0,
    serviceNames: [],
    images: [],
    uploading: false,
    submitting: false,
    error: ''
  },
  onLoad() {
    api.call('companions.list', { sort: 'sales' }).then((list) => {
      const names = ['不关联服务'].concat((list || []).map((x) => x.name))
      this.companions = list || []
      this.setData({ companions: this.companions, serviceNames: names })
    }).catch(() => {})
  },
  onField(event) { this.setData({ [event.currentTarget.dataset.field]: event.detail.value || '' }) },
  onServiceChange(event) { this.setData({ serviceIndex: Number(event.detail.value || 0) }) },
  chooseImages() {
    const remain = 9 - this.data.images.length
    if (remain <= 0) { wx.showToast({ title: '最多上传 9 张图片', icon: 'none' }); return }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const files = (res && res.tempFiles) || []
        if (!files.length) return
        this.uploadFiles(files.map((x) => x.tempFilePath))
      }
    })
  },
  uploadFiles(paths) {
    const app = getApp()
    const openid = (app.globalData.user && app.globalData.user.openid) || 'guest'
    this.setData({ uploading: true, error: '' })
    const tasks = paths.map((filePath, index) => new Promise((resolve, reject) => {
      const cloudPath = 'community/' + openid + '/' + Date.now() + '-' + index + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext(filePath)
      wx.cloud.uploadFile({
        cloudPath,
        filePath,
        success: (res) => resolve(res.fileID),
        fail: (error) => reject(new Error((error && error.errMsg) || '图片上传失败'))
      })
    }))
    Promise.all(tasks).then((fileIds) => {
      this.setData({ uploading: false, images: this.data.images.concat(fileIds.filter(Boolean)).slice(0, 9) })
    }).catch((error) => {
      this.setData({ uploading: false, error: error.message })
      wx.showToast({ title: error.message, icon: 'none' })
    })
  },
  removeImage(event) {
    const index = Number(event.currentTarget.dataset.index)
    const images = this.data.images.slice()
    images.splice(index, 1)
    this.setData({ images })
  },
  previewImage(event) {
    const current = event.currentTarget.dataset.src
    if (!current) return
    wx.previewImage({ urls: this.data.images, current })
  },
  submit() {
    const title = String(this.data.title || '').trim()
    const content = String(this.data.content || '').trim()
    if (title.length < 4 || content.length < 10) { wx.showToast({ title: '标题至少 4 字，正文至少 10 字', icon: 'none' }); return }
    if (this.data.uploading) { wx.showToast({ title: '图片上传中，请稍候', icon: 'none' }); return }
    this.setData({ submitting: true, error: '' })
    const index = Number(this.data.serviceIndex || 0)
    const service = index > 0 ? this.companions[index - 1] : null
    const tags = String(this.data.tagsText || '').split(/[，,]/).map((x) => x.trim()).filter(Boolean).slice(0, 5)
    api.call('community.create', {
      title,
      content,
      topic: this.data.topic,
      serviceId: service ? service.id : '',
      tags,
      images: this.data.images
    }).then(() => {
      wx.showToast({ title: '已提交审核', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    }).catch((error) => {
      this.setData({ submitting: false, error: error.message })
      api.toastError(error)
    })
  }
})