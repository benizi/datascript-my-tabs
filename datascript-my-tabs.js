function tab_props(tab) {
  return Object.keys(tab)
    .filter((k) => typeof(tab[k]) != 'object')
    .map((k) => [k, tab[k]]);
}

function props_to_datoms(dbid, props) {
  return props.map((kv) => [dbid].concat(kv));
}

chrome.browserAction.onClicked.addListener((tab) => {
  var d = datascript;
  var conn = d.create_conn();
  chrome.tabs.query({}, (tabs) => {
    var datoms = tabs.map((tab) => tab_props(tab))
      .map((props, i) => props_to_datoms(-1 - i, props));
    var txns = datoms.map((set) => set.map((row) => [":db/add"].concat(row)))
      .reduce((acc, arr) => acc.concat(arr), []);
    var tx_result = d.transact(conn, txns);
    debugger
  });
});
