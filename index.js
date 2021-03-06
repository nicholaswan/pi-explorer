var express = require('express');
var path = require('path');
var fs = require('fs');
var mime = require('mime');
var _ = require('lodash');
var querystring = require('querystring');
var findit = require('findit');
var app = express();
var argv = require('minimist')(process.argv);

app.set('views', './views');
app.set('view engine', 'pug');

if(!argv['r']){
  console.log('usage: node index.js -r {root_of_dir}')
  return;
}

argv['r'] = _.trimEnd(argv['r'], path.sep);

var root = argv['r'];

app.get('/__*', function(req, res){
  var file_path = querystring.unescape(req.path.substring(3));

  var content_type = mime.lookup(file_path);
  var options = {
    root: path.join(__dirname, "asserts"),
    dotfiles: 'deny',
    headers: {
      'Content-Type': content_type
    }
  }

  var ret = res.sendFile(file_path, options, function(result){
    if(result != null){
      res.status(400).end();
    }
  });
});

function get_cls_by_state(state){
  if(state.isDirectory()){
    return "folder outline";
  } else if(state.isFile()){
    return "file";
  }

  return "";
}

function get_cls(f){
  var state = fs.lstatSync(path.join(root, f));

  return get_cls_by_state(state);
}

function search_file(file_path, leaf, req, res){
  var finder = findit(leaf);

  var sk = querystring.unescape(req.param('key')).toLowerCase();

  var diritems = [];
  finder.on('path', function(p, stat){
    var bpath = p.substring(leaf.length);
    if(path.basename(bpath).toLowerCase().indexOf(sk) != -1){
      var item = {name: path.basename(p), url: bpath, file_type_cls: get_cls_by_state(stat)}
      diritems.push(item);
    }
  });

  finder.on('end', function(){
    res.render('list_dir', { title: file_path, diritems: diritems, bread: create_bread(file_path)});
  });
}

function create_bread(file_path){
    var bread_items = _.trimEnd(file_path, '/').split(path.sep);
    var cur_url = "/";
    var bread = bread_items.map(function(v, i){
      cur_url = path.join(cur_url, v);
      if(v == ''){
        v = "Raspberry Pi";
      }
      return {name: v, url: cur_url, is_last: i == (bread_items.length - 1)}
    });

    return bread;
}

app.get('*', function(req, res){
  var file_path = querystring.unescape(req.path);
  var leaf = path.join(root, file_path);
  var state = fs.lstatSync(leaf);

  if(state == null){
    res.status(400).end();
    return;
  }

  if(state.isDirectory()){
    if(req.param('key')){
      search_file(file_path, leaf, req, res);
    } else {
      var dirs = fs.readdirSync(leaf);
      var bread = create_bread(file_path);
      var items = dirs.map(function(v){
        var tmp = path.join(file_path, v);
        return {name: v, url: tmp, file_type_cls: get_cls(tmp)};
      });
      res.render('list_dir', { title: file_path, diritems: items, bread: bread});
    }
    return;
  } else if(state.isFile()){
    var content_type = mime.lookup(leaf);
    var options = {
      root: root,
      dotfiles: 'deny',
      headers: {
        'Content-Type': content_type
      }
    }

    res.sendFile(file_path, options, function(result){
      if(result != null){
        res.status(400).end();
      }
    });
    return;
  }

  res.end('not implemented');
});

app.listen(8003);
