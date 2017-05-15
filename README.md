# DataScript My Tabs

Playing around with dumping Chromium APIs into a DataScript db.

## Current Status

- Can be loaded as a local extension
    - Inspect the extension's background page
    - Then click the extension's button
    - Debugger will allow playing w/ DataScript for tabs

# Example use

## Preface

Anything you want to do requires this setup:

1. Run the browser action (click button OR use keyboard shortcut)

2. Inspect the extension's background page

## Find tabs

Find window ID, title, and URL of active tabs whose URLs contain 'github', then
activate one of the returned windows:

```js
/* Search the database for the tabs */
// >>> (JS console input):
{
  const {d,conn,tx} = DataScriptMyTabs.latest,
    db = d.db(conn),
    match_fn = (str, search) => str.toLowerCase().match(search.toLowerCase()),
    ret = d.q(`[:find ?window ?title ?url
        :in $ ?contains ?search
        :where
        [?e "active" true]
        [?e "windowId" ?window]
        [?e "title" ?title]
        [?e "url" ?url]
        [(?contains ?url ?search)]]`,
        db, match_fn, 'github');
  console.log(DataScriptMyTabs.format(ret))
}
/* JS console output:
5264	nixpkgs/build-tools.nix at master · NixOS/nixpkgs	https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/mobile/androidenv/build-tools.nix
4762	datascript/tests.js at master · tonsky/datascript	https://github.com/tonsky/datascript/blob/master/test/js/tests.js
6180	transformersworkshop/monad-transformers.pdf at master · azadbolour/transformersworkshop	https://github.com/azadbolour/transformersworkshop/blob/master/doc/monad-transformers.pdf
...
*/
// <- (return):
undefined

/* Activate the window with DataScript's test file open */
// >>>
DataScriptMyTabs.activate(4762);
// <- (return):
undefined

/* Same thing, without the utility function: */
// >>>
chrome.windows.update(4762, {focused:true, drawAttention:true});
```

# License

The DataScript library is released under the Eclipse Public License.

- See [its file](datascript-0.15.4.min.js) for details.

The rest is copyright (c) 2016-2017 Benjamin R. Haskell, and released under the
[MIT License](LICENSE).
