$("#left").on('change', '#decryptCheckbox', function(){
  if(this.checked){
    $(".downloadBlock").show();
    $(".keyBlock").show();
  } else {
    $(".downloadBlock").hide();
    $(".keyBlock").hide();
  }
});
    var db = new SQL.Database();

function filterConversation() {
  // Declare variables 
  var input, filter, table, tr, td, i;
  input = document.getElementById("searchInput");
  filter = input.value.toUpperCase();
  table = document.getElementById("conversationTable");
  tr = table.getElementsByTagName("tr");

  // Loop through all table rows, and hide those who don't match the search query
  for (i = 0; i < tr.length; i++) {
    td = tr[i].getElementsByTagName("td")[0];
    if (td) {
      if (td.innerHTML.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    }
  }
}

function getDateFromTimestamp(timestamp) {
  return new Date(timestamp).format('d.m.Y H:i:s');
}

function showError(message) {
  $("#error").html('<div class="alert alert-danger"><strong>Error!</strong> ' + message + '</div>');
}


var msgstore;
var wa;

var threads_db2;

function showWhatsappDialog() {
  $("#left").html('<h2>Whatsapp</h2><hr><label><input type="checkbox" id="decryptCheckbox"> <strong>Decrypt .crypt12</strong></label><div class="downloadBlock" style="display:none"><br><label><input type="checkbox" id="downloadCheckbox"> <strong>Download decrypted msgstore</strong></label></div><hr><div class="form-group"><label>msgstore.db: <input type="file" id="whatsappCryptFile"></label><div class="keyBlock" style="display:none"><br><label>Key file: <input type="file" id="whatsappKeyFile"></label></div><br><label>wa.db: <small>(optional)</small> <input type="file" id="whatsappWaFile"></label><br><button class="btn btn-primary" onclick="loadWhatsappInput()">Process</button></div><div id="error"></div>');
  $("#right").html('<div class="whatsapp_bg"></div>');

  $(":file").jfilestyle({
    'theme': 'green'
  });
}

function loadWhatsappInput() {
  msgstore = undefined;
  wa = undefined;


  var whatsappCryptFile = document.getElementById("whatsappCryptFile");
  var whatsappKeyFile = document.getElementById("whatsappKeyFile");

  var shouldDecrypt = $('#decryptCheckbox').prop('checked');
  var shouldDownload = $('#downloadCheckbox').prop('checked');

  if(shouldDecrypt){

    if (whatsappCryptFile.files.length != 1 || whatsappKeyFile.files.length != 1) {
    showError("need msgstore.db.crypt12 and key file!");
    return;
  }

  } else {


  if (whatsappCryptFile.files.length != 1) {
    showError("need msgstore.db!");
    return;
  }
}


  var key;
  var crypt;

  var cryptFile = whatsappCryptFile.files[0];
  var keyFile = whatsappKeyFile.files[0];
  var waFile = whatsappWaFile.files[0];


  var a = $.Deferred();
  var b = $.Deferred();
  var c = $.Deferred();

  var whatsappCryptReader = new FileReader();
  whatsappCryptReader.readAsArrayBuffer(cryptFile);
  whatsappCryptReader.onload = function() {
    crypt = new Uint8Array(whatsappCryptReader.result);
    if(!shouldDecrypt){
      msgstore = new SQL.Database(crypt);
    }

    a.resolve();

  };

  if (waFile) {

    var whatsappWaReader = new FileReader();
    whatsappWaReader.readAsArrayBuffer(waFile);


    whatsappWaReader.onload = function() {
      wa = new SQL.Database(new Uint8Array(whatsappWaReader.result));
      b.resolve();

    };
  } else {
    b.resolve();
  }

  if(shouldDecrypt){
  var whatsappKeyReader = new FileReader();
  whatsappKeyReader.readAsArrayBuffer(keyFile);
  whatsappKeyReader.onload = function() {
    key = new Uint8Array(whatsappKeyReader.result);

    c.resolve();

  };
} else {
  c.resolve();
}



  $.when(a, b, c).then(function() {
    if(shouldDecrypt){

        processKey(crypt, key);
           if(shouldDownload){
          saveByteArray("msgstore.db", msgstore.export());

      }

        } 
                  processWhatsapp();

  });



}

function processKey(crypt, key) {
  var T1 = key.slice(30, 30 + 32);
  var KEY = key.slice(126, 126 + 32);

  var T2 = crypt.slice(3, 3 + 32);
  var IV = crypt.slice(51, 51 + 16);

  crypt = crypt.slice(67, crypt.length - 20);
  if (T1.toString() == T2.toString()) {
    console.log("matching key and crypt");
  } else {
    console.log("no matching key and crypt");
    showError("no matching key and crypt");
    return;
  }



  var prp = new sjcl.cipher.aes(sjcl.codec.bytes.toBits(KEY));
  var decrypted = sjcl.mode.gcm.decrypt(prp, sjcl.codec.bytes.toBits(crypt), sjcl.codec.bytes.toBits(IV));
  decrypted = sjcl.codec.bytes.fromBits(decrypted);
  decrypted = new Uint8Array(decrypted);
  var output = pako.inflate(decrypted);


  msgstore = new SQL.Database(output);
  //console.log(dbDecrypted.exec('SELECT name FROM sqlite_master WHERE type = "table"'));

}

function saveByteArray(name, byte) {
  var blob = new Blob([byte], {
    type: 'application/x-sqlite3'
  });
  var link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  var fileName = name;
  link.download = fileName;
  link.click();
};


function lala() {

  var threads_db2File;

  if (facebookFile.files.length != 1) {
    console.log("need 1 file!");
    return;
  }

  if (facebookFile.files[0].name == "threads_db2") {
    threads_db2File = facebookFile.files[0];
  } else {
    console.log("need only threads_db2!");
    return;
  }

  $(".loading").show();

  var threads_db2Reader = new FileReader();
  threads_db2Reader.readAsArrayBuffer(threads_db2File);
  threads_db2Reader.onload = function() {

    var Uints = new Uint8Array(threads_db2Reader.result);
    var db = new SQL.Database(Uints);

    threads_db2 = db;
    processFacebook();
    $(".loading").hide();


  }

}

function findWhatsappName(id) {

  var results = wa.exec('select display_name from wa_contacts where jid = "' + id + '"');

  if (results.length > 0 && results[0]["values"][0][0] != null) {
    return results[0]["values"][0][0];
  } else {
    return id.split('@')[0];
  }

}


function findFacebookName(id) {

  var results = threads_db2.exec('select name from thread_users where user_key = "FACEBOOK:' + id + '"');

  if (results[0]["values"][0][0] != null) {
    return results[0]["values"][0][0];
  } else {
    return id;
  }

}

function processWhatsapp() {

  var conversations = [];
  var sql = msgstore.exec('select key_remote_jid, count(*), max(timestamp) from messages where data != "NULL" group by key_remote_jid HAVING COUNT(*) > 1 order by timestamp desc');

  sql[0]["values"].forEach(function(element) {

    var conv_id = element[0].split('@')[0];
    if (wa) {
      var sender = findWhatsappName(element[0]);
    } else {
      var sender = conv_id;
    }
    var msg_count = element[1];
    var time = getDateFromTimestamp(element[2]);

    var conversation = {
      'id': conv_id,
      'sender': sender,
      'msg_count': msg_count,
      'time': time
    };

    conversations.push(conversation);

  });

  loadWhatsapp(conversations);
}

function processFacebook() {

  var conversations = [];
  var sql = threads_db2.exec('select thread_key, count(*) , max(timestamp_ms) from messages where text != "null" and thread_key like "ONE_TO_ONE%" group by thread_key having count(*) > 1 order by timestamp_ms desc');

  sql[0]["values"].forEach(function(element) {

    var conv_id = element[0].split('ONE_TO_ONE:')[1].split(':')[0];
    var sender = findFacebookName(conv_id);
    var msg_count = element[1];
    var time = getDateFromTimestamp(element[2]);

    var conversation = {
      'id': conv_id,
      'sender': sender,
      'msg_count': msg_count,
      'time': time
    };

    conversations.push(conversation);

  });

  loadFacebook(conversations);
}


function loadWhatsapp(conversations) {


  if (!$("#whatsappListElement").hasClass("active")) {
    $("#whatsappListElement").addClass("active");
  }
  if ($("#facebookListElement").hasClass("active")) {
    $("#facebookListElement").removeClass("active");
  }

  var table = '<button id="toggleButton" class="btn btn-primary" onclick="change_width()"><-></button>';
  table += '<table class="table table-striped">';
  conversations.forEach(function(conv) {

    table += '<tr><td onclick=\'toggle_whatsapp("' + conv["id"] + '")\' style="cursor: pointer;"><a>' + conv["sender"] + '</a></td><td><span class=badge badge-pill badge-primary">' + conv["msg_count"] + '</span></td><td>' + conv["time"] + '</td></tr>';
  });
  table += "</table>";

  $("#left").html(table);
  $("#right").html('<div class="whatsapp_bg"></div>');

  if (typeof twemoji != "undefined") {
    twemoji.parse(document.body);
  }
}

function loadFacebook(conversations) {

  if (!$("#facebookListElement").hasClass("active")) {
    $("#facebookListElement").addClass("active");
  }
  if ($("#whatsappListElement").hasClass("active")) {
    $("#whatsappListElement").removeClass("active");
  }

  var table = '<button id="toggleButton" class="btn btn-primary" onclick="change_width()"><-></button>';
  table += '<table class="table table-striped">';
  conversations.forEach(function(conv) {

    table += '<tr><td onclick=\'toggle_facebook("' + conv["id"] + '")\' style="cursor: pointer;"><a>' + conv["sender"] + '</a></td><td><span class=badge badge-pill badge-primary">' + conv["msg_count"] + '</span></td><td>' + conv["time"] + '</td></tr>';
  });
  table += "</table>";

  $("#left").html(table);
  $("#right").html('<div class="facebook_bg"></div>');

  if (typeof twemoji != "undefined") {
    twemoji.parse(document.body);
  }
}

function getWhatsappConversation(id) {

  var messages = [];
  var results = msgstore.exec('select m.key_remote_jid, m.key_from_me, m.data, m.timestamp, m.remote_resource, t.thumbnail, m.media_duration from messages m left join message_thumbnails t on m.key_id = t.key_id where m.key_remote_jid like "' + id + '@%" order by m.timestamp desc');

  var other = "";
  results[0]["values"].forEach(function(element) {

    var time = getDateFromTimestamp(element[3]);
    var text = element[2];
    var thumbnail = element[5];
    var media_duration = element[6];
    if (text == null) {

      if (thumbnail != null) {
        text = '<img src="' + window.URL.createObjectURL(new Blob([thumbnail])) + '"/>';
      } else if (media_duration != "0") {
        text = 'Audio: ' + media_duration + "s";
      } else {
        return;
      }

    }

    var key_from_me = element[1];
    var remote_resource = element[4];
    if (key_from_me == 1) {
      var sender = "Ich";
    } else {
      if (remote_resource != "" && remote_resource != null) {
        if (wa) {
          other = findWhatsappName(remote_resource);
        } else {
          other = remote_resource.split('@')[0];
        }
      } else if (other == "") {
        if (wa) {
          other = findWhatsappName(element[0]);
        } else {
          other = element[0].split('@')[0];
        }
      }
      var sender = other;
    }

    var message = {
      'sender': sender,
      'time': time,
      'text': text,
      'from_me': key_from_me
    };
    messages.push(message);

  });
  return messages;
}

function getFacebookConversation(id) {

  var messages = [];
  var results = threads_db2.exec('select thread_key, sender, text, timestamp_ms from messages where text != "NULL" and thread_key like "ONE_TO_ONE:' + id + '%" order by timestamp_ms desc');

  results[0]["values"].forEach(function(element) {

    var time = getDateFromTimestamp(element[3]);
    var text = element[2];
    var sender = JSON.parse(element[1]);
    var key_from_me = sender.user_key.split("FACEBOOK:")[1] != id ? 1 : 0;
    sender = sender.name;

    var message = {
      'sender': sender,
      'time': time,
      'text': text,
      'from_me': key_from_me
    };
    messages.push(message);

  });
  return messages;
}


function toggle_whatsapp(id) {
  $(".loading").show({
    complete: function() {

      var conversations = getWhatsappConversation(id);
      var table = '<input type="text" id="searchInput" onkeyup="filterConversation()" placeholder="Filter..">'
      table += '<table class="table table-striped" id="conversationTable">';
      conversations.forEach(function(msg) {
        if (msg["from_me"] == 1) {
          var cssclass = "success";
        } else {
          var cssclass = "info";
        }
        table += "<tr class=" + cssclass + "><td><small>" + msg["time"] + "</small></br><b>" + msg["sender"] + "</b></br>" + msg["text"] + "</td></tr>";
      });
      table += "</table>";

      $("#right").html(table);
      if (typeof twemoji != "undefined") {
        twemoji.parse(document.body);
      }
      $(".loading").hide();
    }
  });
}

function toggle_facebook(id) {
  $(".loading").show({
    complete: function() {

      var conversations = getFacebookConversation(id);

      var table = "<table class=\"table table-striped\">";
      conversations.forEach(function(msg) {
        if (msg["from_me"] == 1) {
          var cssclass = "success";
        } else {
          var cssclass = "info";
        }
        table += "<tr class=" + cssclass + "><td><small>" + msg["time"] + "</small></br><b>" + msg["sender"] + "</b></br>" + msg["text"] + "</td></tr>";
      });
      table += "</table>";

      $("#right").html(table);
      if (typeof twemoji != "undefined") {
        twemoji.parse(document.body);
      }
      $(".loading").hide();
    }
  });
}

function change_width() {
  if ($("#left").hasClass("col-sm-10")) {
    $("#left").removeClass("col-sm-10 col-xs-10").addClass("col-sm-2 col-xs-2");
    $("#right").removeClass("col-sm-2 col-xs-2").addClass("col-sm-10 col-xs-10");
  } else {
    $("#left").removeClass("col-sm-2 col-xs-2").addClass("col-sm-10 col-xs-10");
    $("#right").removeClass("col-sm-10 col-xs-10").addClass("col-sm-2 col-xs-2");
  }
}