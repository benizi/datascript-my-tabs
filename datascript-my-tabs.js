const
  // `flatten` is like http://underscorejs.org/#flatten with shallow=true
  flatten = arrs => arrs.reduce((acc, arr) => acc.concat(arr), []),
  // `idgen` returns a "temp ID" generator (-1, -2, -3, etc.).
  idgen = (i = 0) => () => --i,
  // `gen_dbid` is an instance of a "temp ID" generator.
  gen_dbid = idgen(0),
  // `keyword` creates a Clojure keyword (used by DataScript) as a string.
  keyword = (ns, local) => `:${ns}/${local}`,
  // `_dbid` is just shorthand for the DataScript `:db/id` keyword property.
  _dbid = keyword('db', 'id'),
  // `tap` is akin to http://underscorejs.org/#tap
  tap = fn => x => { fn(x); return x; },
  // `log_it` is `console.log`, but it returns its input.
  log_it = tap(console.log),
  // `entify` adds a type and DB ID to each item in an array.
  entify = (type, items) =>
    items.map(item => Object.assign(item, {type, [_dbid]: gen_dbid()})),
  // `link` adds a link from `ent` to `other`, optionally under key `att`.
  link = (ent, other, att) => {
    ent[keyword(ent.type, att || other.type)] = other[_dbid];
  };

class DataScriptMyTabs {
  static activate(windowId) {
    chrome.windows.update(windowId, {focused:true, drawAttention:true});
  }
  static detach(tabId) {
    chrome.windows.create({tabId});
  }
  static find_by_url(url, dbstate) {
    if (!dbstate) dbstate = DataScriptMyTabs.latest;
    const {d = datascript, conn = d.create_conn(), db = d.db(conn)} = dbstate;
    return ({d, conn, db, url,
      q: d.q(`[:find ?w ?i ?ti ?u
        :in $ ?contains ?passed_url
        :where
        [?e "index" ?i]
        [?e "windowId" ?w]
        [?e "active" true]
        [?e "title" ?ti]
        [?e "url" ?u]
        [(?contains ?u ?passed_url)]]`,
        db,
        (s,m)=>s.toLowerCase().match(m),
        url)});
  }
  static format(ret) {
    return ret.map(tup => tup.join("\t")).join("\n");
  }
}

// Futures avoid the weird(-to-me) inside-out-ness of Promises:
//
// const promise = new Promise((resolve, reject) => {
//   something.asynchronous(..., things => {
//     ...
//     resolve(processedThings); // The Promise injects `resolve`
//   });
// });
//
// const theThings = future();
// something.asynchronous(..., things => {
//   ...
//   theThings.resolve(processedThings); // I control `theThings`'s scope
// });
let future = name => {
  let resolve, reject;
  const promise = new Promise((a,b) => {
    resolve = a;
    reject = b;
  }),
    then = (res,rej) => promise.then(res,rej),
    _catch = fn => promise.catch(fn),
    log = msg => then(tap(_ => console.log(msg))),
    failname = name || 'future';
  if (name) log(`${name} future resolved`);
  _catch(tap(e => console.log(`${name} future failed: ${e}`)));
  return {promise, resolve, reject, then, 'catch':_catch, log};
};

/* TODO: I'd prefer to write this, but something's off about the inheritance.
class Future extends Promise {
  constructor(name) {
    let captured = {};
    super((resolve, reject) => { captured = ({resolve, reject}) });
    Object.assign(this, captured);
  }
}
*/

chrome.browserAction.onClicked.addListener((tab) => {
  const d = datascript,
    is_db_ref = {':db/valueType':':db.type/ref'},
    schema = {':visit/hist': is_db_ref},
    conn = d.create_conn(schema),
    setups = [future('tabs'), future('items')],
    [_tabs, _items] = setups,
    setup_promises = setups.map(i => i.promise),
    fetchers = setup_promises.map(i => Promise.resolve(i));

  chrome.tabs.query({}, tabs => _tabs.resolve(entify('tab', tabs)));
  console.log('queried tabs');

  chrome.history.search({
      text: '',
      startTime: 0,
      maxResults: 100000,
    },
    items => {
      entify('hist', items);
      items.forEach(item => {
        const {url} = item;
        fetchers.push(new Promise(resolve => {
          chrome.history.getVisits({url}, visits => {
            entify('visit', visits);
            visits.forEach(v => link(v, item));
            resolve(visits);
          });
        }));
      });
      _items.resolve(items);
    });
  console.log('queried history');

  Promise.all(setup_promises).then(() => {
    console.log('waiting for visit information');
    Promise.all(fetchers).then(entitysets => {
      console.log('all entities resolved');
      const entities = flatten(entitysets),
        tx = d.transact(conn, entities);
      DataScriptMyTabs.latest = {d,conn,tx,entities};
      console.log('history committed');
    });
  }).catch(log_it);
});
