class IMOpenRequestBodyBuilder {
    constructor(template) {
        this.template = template;
    }

    withUser(user) {
        const newTemplate = Object.assign({}, this.template, {user});
        return new IMOpenRequestBodyBuilder(newTemplate);
    }

    build() {
        return Object.assign({}, this.template);
    }
}

const defaultTemplate = { 
    user: '',
    token: /.*/
}

module.exports = new IMOpenRequestBodyBuilder(defaultTemplate);