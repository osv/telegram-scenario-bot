// I use wrapper for runit.
// Babel-node will fork process
// see "Forever does not kill child process when used with -c"
// https://github.com/foreverjs/forever/issues/687
//
// so I run this demo
//
// export BOT_TOKEN=....
// exec chpst -U a1007 node \
//     ./examples/gamemenu/wrapper.js

require('babel/register')({ stage: 0 });
require('./index.js');
