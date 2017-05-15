const execute = require('execute-shell-promise');

 
execute("pwd; make test;").then((stdout) => {
  console.log(stdout); // Outputs "Hello World"
}).catch(console.error);