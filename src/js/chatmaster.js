var msgstore;
var wa;
$( document ).ready(function() {
    showWhatsappDialog();
});

$(document).on('change', '#decryptCheckbox', function() {
  if (this.checked) {
    $(".downloadBlock").show();
    $(".keyBlock").show();
    $("#msgstoreLabel").html("msgstore.db.crypt12:");
  } else {
    $(".downloadBlock").hide();
    $(".keyBlock").hide();
    $("#msgstoreLabel").html("msgstore.db:");
  }
});

function filterConversation(input) {
  var filter, table, tr, td, i;
  filter = input.value.toUpperCase();
  table = $(input).siblings('table').get(0);
  tr = table.getElementsByTagName("tr");

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

function showWhatsappDialog() {
  $('#left').removeClass().addClass('hidden-xs hidden-sm hidden-md hidden-lg');
  $('#left').html("");
  $('#right').removeClass().addClass('col-xs-10 col-xs-offset-1 col-md-8 col-md-offset-2');

  $("#right").load("infoSnippet.html", function() {
  $(":file").jfilestyle({
    'theme': 'green'
  });
});


}

function validateWA() {

  try {
    var result = wa.exec('SELECT name FROM sqlite_master WHERE type = "table"');
    var found = false;
    result[0]["values"].forEach(function(array) {
      if (array.includes("wa_contacts")) {
        found = true;
      }
    });
    if (found) {
      return true;
    } else {
      showError("wa file seems to be invalid");
      return false;
    }

  } catch (err) {
    showError("wa: " + err.message);
    return false;
  }

}

function validateMsgstore() {

  try {
    var result = msgstore.exec('SELECT name FROM sqlite_master WHERE type = "table"');
    var found = false;
    result[0]["values"].forEach(function(array) {
      if (array.includes("messages")) {
        found = true;
      }
    });
    if (found) {
      return true;
    } else {
      showError("msgstore file seems to be invalid");
      return false;
    }

  } catch (err) {
    showError("msgstore: " + err.message);
    return false;
  }

}


function loadWhatsappInput() {

  msgstore = undefined;
  wa = undefined;

  $(".loading").show();

  var whatsappCryptFile = document.getElementById("whatsappCryptFile");
  var whatsappKeyFile = document.getElementById("whatsappKeyFile");

  var shouldDecrypt = $('#decryptCheckbox').prop('checked');
  var shouldDownload = $('#downloadCheckbox').prop('checked');

  if (shouldDecrypt) {
    if (whatsappCryptFile.files.length != 1 || whatsappKeyFile.files.length != 1) {
      showError("need msgstore.db.crypt12 and key file!");
      $(".loading").hide();
      return;
    }
  } else {
    if (whatsappCryptFile.files.length != 1) {
      showError("need msgstore.db!");
      $(".loading").hide();
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
    if (!shouldDecrypt) {
      msgstore = new SQL.Database(crypt);
    }
    a.resolve();
  };

  if (waFile) {
    var whatsappWaReader = new FileReader();
    whatsappWaReader.readAsArrayBuffer(waFile);
    whatsappWaReader.onload = function() {
      wa = new SQL.Database(new Uint8Array(whatsappWaReader.result));
      if (validateWA()) {
        b.resolve();
      } else {
        b.reject();
      }
    };
  } else {
    b.resolve();
  }

  if (shouldDecrypt) {
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
    if (shouldDecrypt) {
      processKey(crypt, key);
    }
    if (msgstore && validateMsgstore()) {
      processWhatsapp();
      if (shouldDownload) {
        saveByteArray("msgstore.db", msgstore.export());
      }

    }

    $(".loading").hide();

  }, function() {
    $(".loading").hide();
  });

}

function processKey(crypt, key) {
  var T1 = key.slice(30, 30 + 32);
  var KEY = key.slice(126, 126 + 32);

  var T2 = crypt.slice(3, 3 + 32);
  var IV = crypt.slice(51, 51 + 16);

  crypt = crypt.slice(67, crypt.length - 20);
  if (T1.toString() != T2.toString()) {
    showError("key and crypt file don't match");
    return false;
  }

  var prp = new sjcl.cipher.aes(sjcl.codec.bytes.toBits(KEY));
  var decrypted = sjcl.mode.gcm.decrypt(prp, sjcl.codec.bytes.toBits(crypt), sjcl.codec.bytes.toBits(IV));
  decrypted = sjcl.codec.bytes.fromBits(decrypted);
  decrypted = new Uint8Array(decrypted);
  var unzipped = pako.inflate(decrypted);

  msgstore = new SQL.Database(unzipped);
  return true;
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


function findWhatsappName(id) {

  var results = wa.exec('select display_name from wa_contacts where jid = "' + id + '"');

  if (results.length > 0 && results[0]["values"][0][0] != null) {
    return results[0]["values"][0][0];
  } else {
    return id.split('@')[0];
  }

}

function processWhatsapp() {

  var conversations = [];
  var sql = msgstore.exec('select key_remote_jid, count(*), max(timestamp) from messages where data != "NULL" group by key_remote_jid HAVING COUNT(*) > 1 order by timestamp desc');
  if (sql[0]) {
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
  } else {
    showError("No messages found!")
    return;
  }

  loadWhatsapp(conversations);
}

function loadWhatsapp(conversations) {

  var table = '<button id="toggleButton" class="btn btn-default" onclick="change_width()"><<</button>';
  table +='<input type="text" class="searchInput" onkeyup="filterConversation(this)" placeholder="Filter..">'
  table += '<table class="table table-striped">';
  conversations.forEach(function(conv) {
    table += '<tr><td onclick=\'showWhatsappConveration("' + conv["id"] + '")\' style="cursor: pointer;"><a>' + conv["sender"] + '</a></td><td><span class=badge badge-pill badge-primary">' + conv["msg_count"] + '</span></td><td>' + conv["time"] + '</td></tr>';
  });
  table += "</table>";

  $("#left").html(table);
  $("#right").html('<div class="whatsapp_bg"></div>');
        $("#left").removeClass().addClass('col-md-4 col-sm-10 col-xs-10');
      $("#right").removeClass().addClass('col-md-8 col-sm-2 col-xs-2');

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



function showWhatsappConveration(id) {
  $(".loading").show({
    complete: function() {

      var conversations = getWhatsappConversation(id);
      var table = '<input type="text" class="searchInput" onkeyup="filterConversation(this)" placeholder="Filter..">';
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



function change_width() {
  if ($("#left").hasClass("col-sm-10")) {
    $("#toggleButton").text(">>");
    $("#left").removeClass("col-sm-10 col-xs-10").addClass("col-sm-2 col-xs-2");
    $("#right").removeClass("col-sm-2 col-xs-2").addClass("col-sm-10 col-xs-10");
  } else {
    $("#toggleButton").text("<<");
    $("#left").removeClass("col-sm-2 col-xs-2").addClass("col-sm-10 col-xs-10");
    $("#right").removeClass("col-sm-10 col-xs-10").addClass("col-sm-2 col-xs-2");
  }
}