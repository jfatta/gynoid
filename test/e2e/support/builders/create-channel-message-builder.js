class CreateChannelMessageBuilder {
  constructor(template) {
    this.template = template;
  }

  withId(channelId) {
    const newChannel = Object.assign({}, this.template.channel, {id: channelId});
    return new CreateChannelMessageBuilder(Object.assign({}, this.template, {channel: newChannel}));
  }

  build() {
    const channel = Object.assign({}, this.template.channel);
    return Object.assign({}, this.template, {channel});
  }
}

const template = {
  type: 'channel_created',
  channel: {
    id: '',
    is_channel: true,
    name: 'defaultName',
    name_normalized: 'defaultName',
    created: 1550783390,
    creator: 'UFV8PDTFG',
    is_shared: false,
    is_org_shared: false
  },
  event_ts: '1550783390.002800'
};

module.exports = new CreateChannelMessageBuilder(template);
