const fs = require('fs');
const path = require('path');

const createNewGynoidConfig = (configPath) => {
    return new Promise((resolve, reject) => {
        const config = {
            keys: {
                "GITHUB_TOKEN": "mock-github-token",
                "GYNOID_TOKEN": "mock-slack-token"
            },
        };
        fs.writeFile(path.normalize(configPath), JSON.stringify(config, null, 2), (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        })
    })
};

module.exports = createNewGynoidConfig;