const defaultRTMFixture = require('../../fixtures/rtm.start');

class RTMFixtureBuilder {
    constructor(template) {
        this.template = template;
    }

    withId(id) {
        const newSelf = Object.assign({}, this.template.self, {id});
        const newTemplate = Object.assign({}, this.template, {self: newSelf});
        return new RTMFixtureBuilder(newTemplate);
    }

    withName(name) {
        const newSelf = Object.assign({}, this.template.self, {name});
        const newTemplate = Object.assign({}, this.template, {self: newSelf});
        return new RTMFixtureBuilder(newTemplate);
    }

    withUrl(url) {
        const newTemplate = Object.assign({}, this.template, {url});
        return new RTMFixtureBuilder(newTemplate);
    }

    build() {
        return Object.assign({}, this.template);
    }
}

module.exports = new RTMFixtureBuilder(defaultRTMFixture);