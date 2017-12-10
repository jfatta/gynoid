'use strict';

var fs = require('fs');

module.exports = class GynoidDroid {
  constructor(cluster) {
    this.cluster = cluster;
  }

  registerGynoid(req, res) {
    var name = req.params.name === 'me' ? 'gynoid' : req.params.name;
    var token = req.params.token;

    this.cluster.startGynoid({ name: name, token: token, keys: {} })
      .then(() => res.text(`Gynoid ${name} initialized`))
      .catch((err) => res.text('Unable to initialize Gynoid.\n```' + err + '```'));
  }

  unregisterGynoid(req, res) {
    var name = req.params.name === 'me' ? 'gynoid' : req.params.name;
    this.cluster.removeGynoid(name)
      .then(res.text(`Gynoid ${name} successfully removed`))
      .catch((err) => res.text('Unable to remove Gynoid.\n```' + err + '```'));
  }

  reloadGynoid(req, res) {
    var name = req.params.name === 'me' ? 'gynoid' : req.params.name;
    this.cluster.reloadGynoid(name)
      .then(() => res.text(`Droid ${name} successfully reloaded`))
      .catch((err) => res.text('Unable to reload Droid.\n```' + err.stack + '```'));
  }

  extendDroid(req, res) {
    var name = req.params.name;
    var repo = req.params.repo;

    this.cluster.installExtension(repo, name)
      .then(() => {
        res.text(`Droid ${name} successfully extended`)
        req.params.name = name;
        return this.reloadGynoid(req, res);
      })
      .catch((err) => res.text('Unable to extend Droid.\n```' + err + '```'));
  }

  removeExtension(req, res) {
    var name = req.params.name === 'me' ? 'gynoid' : req.params.name;
    var extension = req.params.extension;

    if (name === 'gynoid' && extension.toLowerCase() === 'gynoid-droid') {
      return res.text('Unable to remove core extension from Gynoid.');
    }

    this.cluster.removeExtension(extension, name)
      .then(() => {
        res.text(`Extension ${extension} successfully removed`)
        req.params.name = name;
        return this.reloadGynoid(req, res);
      })
      .catch((err) => res.text('Unable to remove extension ' + extension + '.\n```' + err + '```'));
  }

  listExtensions(req, res) {
    var name = req.params.name === 'me' ? 'gynoid' : req.params.name;
    var droid = this.cluster.gynoids[name];

    if (!droid) {
      return res.text('Unable to list extensions.\n```Could not find droid in the registry```')
    }

    var extensions = droid.extensions.map(function (extension) { return '`' + extension.name + '`'; }).join(', ');
    var msg = extensions.length === 0 ? 'No extensions installed' : 'Installed extensions for ' + name + ': ' + extensions;
    return res.text(msg)
  }

  ping(req, res) {
    return res.text('`Hey Pong!`');
  }

  listDroids(req, res) {
    var bots = Object.keys(this.cluster.gynoids).map((botName) => '`' + botName + '`').join(', ');
    return res.text(bots);
  }

  addKey(req, res) {
    try {
      var key = req.params.key;
      var value = req.params.value;
      var droid = req.params.droid;

      this.cluster.addKey(droid, key, value);
      return res.text('Key added')
    } catch (e) {
      return res.text('Unable to add Key')
    }
  }

  removeKey(req, res) {
    try {
      var key = req.params.key;
      var droid = req.params.droid;

      this.cluster.removeKey(droid, key);
      return res.text('Key was removed')
    } catch (e) {
      return res.text('Unable to remove Key')
    }
  }

  listKeys(req, res) {
    try {
      var droid = req.params.droid;
      var keys = this.cluster.listKeys(droid);
      var text = keys.length === 0 ? 'No configured keys for this droid.' : keys.join('\n');

      return res.text('Configured keys for ' + droid + ':\n' + text)
    } catch (e) {
      return res.text('Unable to list the keys: ' + e.stack);
    }
  }

  listAllKeys(req, res) {
    try {
      var keys = this.cluster.listAllKeys();
      var text = keys.length === 0 ? 'No keys found.' : keys.join('\n');
      return res.text('Configured keys:\n' + text)
    } catch (e) {
      return res.text('Unable to list the keys')
    }
  }
  secure(req, res) {
    try {
      var droid = require('../droid.json');
      droid.actions = droid.actions.map((action) => {
        action.acls = action.acls || {};
        action.acls.dm = false;
        action.acls.channels = req.params.channel;
        return action;
      });

      fs.writeFileSync(__dirname + '/../droid.json', JSON.stringify(droid, null, 2));
      req.params.name = 'me';
      res.text('Secured gynoid in channel ' + req.params.channel)
      return this.reloadGynoid(req, res);
    } catch (err) {
      return res.text('Unable to secure gynoid.\n```' + err + '```')
    }
  }
};
