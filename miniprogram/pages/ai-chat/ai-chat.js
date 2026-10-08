const api = require('../../utils/api')
Page({
  data: { input: '', messages: [{ role: 'assistant', content: '你好，我是 VOID 智能客服。可以问我陪玩档位、下单流程、付款核销、订单状态和社区规则。' }], sending: false, quick: ['怎么下单？','付款后多久接单？','订单怎么取消？','社区发帖规则是什么？'] },
  onInput(event) { this.setData({ input: event.detail.value || '' }) },
  sendQuick(event) { this.ask(event.currentTarget.dataset.text || '') },
  send() { this.ask(this.data.input) },
  ask(text) { const content = String(text || '').trim(); if (!content || this.data.sending) return; const messages = this.data.messages.concat([{ role: 'user', content }]); this.setData({ messages, input: '', sending: true }); api.call('ai.ask', { message: content }).then((data) => this.setData({ sending: false, messages: messages.concat([{ role: 'assistant', content: data.answer || '暂时没有找到答案。' }]) })).catch((error) => this.setData({ sending: false, messages: messages.concat([{ role: 'assistant', content: '连接异常：' + error.message }]) })) }
})
